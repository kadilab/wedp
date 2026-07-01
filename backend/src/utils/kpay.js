const crypto = require('crypto');
const https = require('https');
const logger = require('./logger');
const fx = require('./fx');

// Force IPv4 — avoids connect timeouts when the host's IPv6 is broken (common on
// VPS / VPN). We use Node's built-in `https` module to stay dependency-free:
// undici 8.x crashes on the Node 20 runtime in the container
// (`webidl.util.markAsUncloneable is not a function`). See README-USSD-CDF.md §3.
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

// K-PAY Mobile Money client.
// Docs: https://kpay.site/documentation
const BASE_URL = process.env.KPAY_BASE_URL || 'https://admin.kpay.site';
const API_KEY = process.env.KPAY_API_KEY || '';
const SECRET_KEY = process.env.KPAY_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET || '';

const isConfigured = () => Boolean(API_KEY && SECRET_KEY);

// K-PAY charges in the OPERATOR-COUNTRY currency (the `currency` field is
// derived by K-PAY, never sent). Convert our stored price into the K-PAY
// account/zone currency:
//   KPAY_PRICE_CURRENCY   = currency our prices are stored in (default CDF — set
//                           in the admin price inputs).
//   KPAY_ACCOUNT_CURRENCY = currency K-PAY settles in (CDF for RDC operators).
// When both match (the common RDC case) NO conversion happens — the price is
// already in the right currency. Otherwise an FX rate is fetched LIVE
// (fxapi.app, cached 1h) with env fallback (KPAY_USD_RATE / KPAY_USD_TO_XAF).
// USD uses decimals; XAF/XOF/CDF/KES are whole units. KPAY_MIN_AMOUNT = floor.
async function toAccountAmount(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const account = (process.env.KPAY_ACCOUNT_CURRENCY || 'CDF').toUpperCase();
  const priceCur = (process.env.KPAY_PRICE_CURRENCY || 'CDF').toUpperCase();
  const isDecimal = account === 'USD';

  // Rate to go from priceCur -> account. Same currency = no conversion.
  let rate = 1;
  if (priceCur !== account) {
    if (priceCur === 'USD') rate = await fx.getUsdRate(account);
    else if (account === 'USD') rate = 1 / (await fx.getUsdRate(priceCur));
    // else: no cross-rate available — assume parity.
  }

  let amount = isDecimal ? Math.round(value * rate * 100) / 100 : Math.round(value * rate);
  const min = parseFloat(process.env.KPAY_MIN_AMOUNT || (isDecimal ? '0.5' : '50')) || (isDecimal ? 0.5 : 50);
  if (amount < min) amount = min;
  return amount;
}

// Low-level HTTPS request over the IPv4 agent. Resolves with { status, data }
// (data = parsed JSON, or {} when the body isn't JSON). Rejects only on
// transport errors (DNS, connect timeout, socket reset) — HTTP error statuses
// resolve so the caller can read the K-PAY error body.
function httpsRequest(url, { method, headers, body, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, agent: ipv4Agent }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { message: raw }; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error('K-PAY request timeout'), { code: 'ETIMEDOUT' }));
    });
    if (body) req.write(body);
    req.end();
  });
}

// Single HTTP helper for all K-PAY calls: IPv4 + retry on transient transport
// errors. Throws an Error with `.status` and `.data` on non-2xx responses.
async function kpayFetch(path, { method = 'GET', body, retries = 2 } = {}) {
  const url = `${BASE_URL}/api/v1${path}`;
  const payload = body ? JSON.stringify(body) : undefined;
  const headers = {
    'X-API-Key': API_KEY,
    'X-Secret-Key': SECRET_KEY,
    'Content-Type': 'application/json'
  };
  if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { status, data } = await httpsRequest(url, { method, headers, body: payload });
      if (status < 200 || status >= 300) {
        const err = new Error(data?.message || `KPay ${status}`);
        err.status = status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      lastErr = err;
      // Retry only on transport-level failures (no HTTP status attached).
      const transient = !err.status && ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(err.code);
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

// Application/account info: { application, company, environment: 'TEST'|'LIVE' }
function getMe() {
  return kpayFetch('/payments/me');
}

// Operator availability per country/operation (OPERATIONAL/DELAYED/CLOSED).
function getAvailability() {
  return kpayFetch('/payments/availability');
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
  getMe,
  getAvailability,
  verifyWebhookSignature,
  BASE_URL
};
