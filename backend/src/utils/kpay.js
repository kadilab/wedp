const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');

// K-PAY Mobile Money gateway client.
// Docs: https://kpay.site/documentation
const BASE_URL = process.env.KPAY_BASE_URL || 'https://admin.kpay.site';
const API_KEY = process.env.KPAY_API_KEY || '';
const SECRET_KEY = process.env.KPAY_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET || '';

const isConfigured = () => Boolean(API_KEY && SECRET_KEY);

const client = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
});

function authHeaders() {
  return { 'X-API-Key': API_KEY, 'X-Secret-Key': SECRET_KEY };
}

/**
 * Initiate a payment (collect money from a customer).
 * GATEWAY mode: pass returnUrl (+ optional cancelUrl), omit phoneNumber.
 * USSD mode: pass phoneNumber + provider.
 */
async function initPayment(payload) {
  const { data } = await client.post('/payments/init', payload, { headers: authHeaders() });
  return data;
}

async function getPayment(id) {
  const { data } = await client.get(`/payments/${id}`, { headers: authHeaders() });
  return data;
}

/** Send money to a Mobile Money account (creator payout). */
async function withdraw(payload) {
  const { data } = await client.post('/payments/withdraw', payload, { headers: authHeaders() });
  return data;
}

async function getWithdraw(id) {
  const { data } = await client.get(`/payments/withdraw/${id}`, { headers: authHeaders() });
  return data;
}

async function predictProvider(phoneNumber) {
  const { data } = await client.post('/payments/predict-provider', { phoneNumber }, { headers: authHeaders() });
  return data;
}

async function getBalance() {
  const { data } = await client.get('/payments/balance', { headers: authHeaders() });
  return data;
}

/**
 * Verify a webhook signature. K-PAY sends HMAC-SHA256 (hex) of the raw JSON
 * body in the `X-KPAY-Signature` header.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!WEBHOOK_SECRET || !signature || !rawBody) return false;
  try {
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET)
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
  initPayment,
  getPayment,
  withdraw,
  getWithdraw,
  predictProvider,
  getBalance,
  verifyWebhookSignature,
  BASE_URL
};
