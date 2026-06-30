const crypto = require('crypto');
const { Agent, fetch } = require('undici');
const logger = require('./logger');
const fx = require('./fx');

// Force IPv4 — avoids UND_ERR_CONNECT_TIMEOUT when the host's IPv6 is broken
// (common on VPS / VPN). The native fetch refuses an external dispatcher, so we
// import fetch FROM undici. See README-USSD-CDF.md §3.
const ipv4Dispatcher = new Agent({ connect: { family: 4 } });

// K-PAY Mobile Money client.
// Docs: https://kpay.site/documentation
const BASE_URL = process.env.KPAY_BASE_URL || 'https://admin.kpay.site';
const API_KEY = process.env.KPAY_API_KEY || '';
const SECRET_KEY = process.env.KPAY_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET || '';

const isConfigured = () => Boolean(API_KEY && SECRET_KEY);

// K-PAY charges in the OPERATOR-COUNTRY currency (the `currency` field is
// derived by K-PAY, never sent). Our prices are in USD, so convert to whatever
// currency the K-PAY account/zone settles in:
//   KPAY_ACCOUNT_CURRENCY = XAF (default) | CDF | XOF | KES | USD ...
//   Exchange rate is fetched LIVE (fxapi.app, cached 1h) with env fallback
//   (KPAY_USD_RATE / KPAY_USD_TO_XAF). KPAY_MIN_AMOUNT = minimum charge.
// USD uses decimals; XAF/XOF/CDF/KES are whole units. Async (live rate lookup).
async function toAccountAmount(usd) {
  const value = Number(usd);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const currency = (process.env.KPAY_ACCOUNT_CURRENCY || 'XAF').toUpperCase();
  const isDecimal = currency === 'USD';

  const rate = isDecimal ? 1 : await fx.getUsdRate(currency);

  let amount = isDecimal ? Math.round(value * rate * 100) / 100 : Math.round(value * rate);
  const min = parseFloat(process.env.KPAY_MIN_AMOUNT || (isDecimal ? '0.5' : '50')) || (isDecimal ? 0.5 : 50);
  if (amount < min) amount = min;
  return amount;
}

// Single HTTP helper for all K-PAY calls: IPv4 dispatcher + retry on connect
// timeouts. Throws an Error with `.status` and `.data` on non-2xx responses.
async function kpayFetch(path, { method = 'GET', body, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        method,
        headers: {
          'X-API-Key': API_KEY,
          'X-Secret-Key': SECRET_KEY,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        dispatcher: ipv4Dispatcher
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || `KPay ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      lastErr = err;
      const transient = err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
      if (!transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Initiate a payment (collect money from a customer).
 * DIRECT/USSD mode: pass provider + phoneNumber (currency follows the operator).
 * GATEWAY mode: pass returnUrl (+ optional cancelUrl), omit phoneNumber.
 */
function initPayment(payload) {
  return kpayFetch('/payments/init', { method: 'POST', body: payload });
}

function getPayment(id) {
  return kpayFetch(`/payments/${id}`);
}

/** Send money to a Mobile Money account (creator payout). */
function withdraw(payload) {
  return kpayFetch('/payments/withdraw', { method: 'POST', body: payload });
}

function getWithdraw(id) {
  return kpayFetch(`/payments/withdraw/${id}`);
}

// Normalize a Mobile Money number to the operator's international format (no +).
// RDC operators (*_COD) expect 243XXXXXXXXX. Strips spaces/+, "00" prefix, and a
// leading national "0", prepending 243 when missing.
function normalizeMomoPhone(phone, provider = '') {
  let p = String(phone || '').replace(/[^\d]/g, '');
  p = p.replace(/^00/, '');
  if (String(provider).toUpperCase().endsWith('_COD')) {
    if (p.startsWith('0')) p = '243' + p.slice(1);
    else if (!p.startsWith('243')) p = '243' + p;
  }
  return p;
}

// Best-effort extraction of a human-readable K-PAY error message. kpayFetch
// attaches the parsed body on `error.data`; network errors only have `.message`.
function extractApiError(error) {
  const d = error?.data;
  if (d) {
    if (typeof d === 'string') return d;
    if (Array.isArray(d.message)) return d.message.join(' · ');
    if (d.message || d.error) return d.message || d.error;
  }
  return error?.message || 'Erreur réseau K-PAY';
}

function predictProvider(phoneNumber) {
  return kpayFetch('/payments/predict-provider', { method: 'POST', body: { phoneNumber } });
}

function getBalance() {
  return kpayFetch('/payments/balance');
}

/**
 * Verify a webhook signature. K-PAY sends HMAC-SHA256 (hex) of the raw JSON
 * body in the `X-KPAY-Signature` header.
 */
function verifyWebhookSignature(rawBody, signature) {
  // KPay signs with the dashboard webhook secret; fall back to the secret key
  // when no dedicated webhook secret is set (matches the reference integration).
  const secret = WEBHOOK_SECRET || SECRET_KEY;
  if (!secret || !signature || !rawBody) return false;
  try {
    const expected = crypto.createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (err) {
    logger.error('K-PAY signature verification error:', err);
    return false;
  }
}

module.exports = {
  isConfigured,
  toAccountAmount,
  normalizeMomoPhone,
  extractApiError,
  initPayment,
  getPayment,
  withdraw,
  getWithdraw,
  predictProvider,
  getBalance,
  verifyWebhookSignature,
  BASE_URL
};
