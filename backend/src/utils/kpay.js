const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const fx = require('./fx');

const prisma = new PrismaClient();

// Force IPv4 — avoids connect timeouts when the host's IPv6 is broken (common on
// VPS / VPN). We use Node's built-in `https` module to stay dependency-free:
// undici 8.x crashes on the Node 20 runtime in the container
// (`webidl.util.markAsUncloneable is not a function`). See README-USSD-CDF.md §3.
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

// K-PAY Mobile Money client.
// Docs: https://kpay.site/documentation
//
// Configurable from Admin → Paramètres → Paiement (stored in the `Setting`
// table), same pattern as Telegram (see telegram.js:getTelegramConfig). A
// non-empty DB value wins; otherwise falls back to the env vars so an existing
// VPS configured only via `.env` keeps working unchanged. `kpayEnabled` absent
// from the DB means "enabled" — preserves current behavior for installs that
// have never touched this screen.
//
// Two key sets live side by side so the admin can flip between sandbox and
// production with one button (Admin → Paramètres → Paiement):
//   LIVE : kpayApiKey / kpaySecretKey / kpayWebhookSecret             (KPAY_API_KEY…)
//   TEST : kpayTestApiKey / kpayTestSecretKey / kpayTestWebhookSecret (KPAY_TEST_API_KEY…)
// `kpayMode` ('TEST' | 'LIVE') picks the active set. When it was never set we
// infer it from the live key prefix (kpay_test_… → TEST) so existing installs
// keep behaving exactly as before.
const SETTING_KEYS = [
  'kpayEnabled', 'kpayMode', 'kpayBaseUrl',
  'kpayApiKey', 'kpaySecretKey', 'kpayWebhookSecret',
  'kpayTestApiKey', 'kpayTestSecretKey', 'kpayTestWebhookSecret',
  'kpayGatewaySecret', 'kpayCardEnabled', 'kpayDisabledProviders',
  'kpayAccountCurrency', 'kpayPriceCurrency', 'kpayMinAmount'
];

// RDC Mobile Money operators we offer, in display order.
const MOMO_PROVIDERS = [
  { provider: 'VODACOM_MPESA_COD', label: 'Vodacom M-Pesa' },
  { provider: 'AIRTEL_COD', label: 'Airtel Money' },
  { provider: 'ORANGE_COD', label: 'Orange Money' }
];

// Copy-pasting a key from a dashboard very often drags in a leading/trailing
// space or newline — trim defensively so that alone never causes a silent
// "Invalid API credentials" from K-PAY.
const pick = (dbVal, envVal, fallback = '') => {
  const v = (dbVal && String(dbVal).trim()) || (envVal && String(envVal).trim()) || fallback;
  return v;
};

async function getKpayConfig() {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const db = {};
  rows.forEach(s => { db[s.key] = s.value; });

  const live = {
    apiKey: pick(db.kpayApiKey, process.env.KPAY_API_KEY),
    secretKey: pick(db.kpaySecretKey, process.env.KPAY_SECRET_KEY),
    webhookSecret: pick(db.kpayWebhookSecret, process.env.KPAY_WEBHOOK_SECRET)
  };
  const test = {
    apiKey: pick(db.kpayTestApiKey, process.env.KPAY_TEST_API_KEY),
    secretKey: pick(db.kpayTestSecretKey, process.env.KPAY_TEST_SECRET_KEY),
    webhookSecret: pick(db.kpayTestWebhookSecret, process.env.KPAY_TEST_WEBHOOK_SECRET)
  };

  let mode = String(pick(db.kpayMode, process.env.KPAY_MODE)).toUpperCase();
  if (mode !== 'TEST' && mode !== 'LIVE') {
    mode = live.apiKey.startsWith('kpay_test_') ? 'TEST' : 'LIVE';
  }
  const keys = mode === 'TEST' ? test : live;

  const disabledProviders = pick(db.kpayDisabledProviders, process.env.KPAY_DISABLED_PROVIDERS)
    .split(',').map(p => p.trim().toUpperCase()).filter(Boolean);

  return {
    enabled: db.kpayEnabled === undefined ? true : db.kpayEnabled !== 'false',
    mode,
    baseUrl: pick(db.kpayBaseUrl, process.env.KPAY_BASE_URL, 'https://admin.kpay.site'),
    apiKey: keys.apiKey,
    secretKey: keys.secretKey,
    webhookSecret: keys.webhookSecret,
    // Signs the hosted-page return (?status&reference&externalId&ts&sig). KPay
    // hasn't confirmed whether it differs from the webhook secret — fall back.
    gatewaySecret: pick(db.kpayGatewaySecret, process.env.KPAY_GATEWAY_SECRET) || keys.webhookSecret || keys.secretKey,
    // Production webhooks stay valid while the admin is in TEST mode (it's
    // real money); sandbox webhooks are never accepted in LIVE mode.
    liveWebhookSecret: mode === 'TEST' ? (live.webhookSecret || live.secretKey) : '',
    hasTestKeys: Boolean(test.apiKey && test.secretKey),
    hasLiveKeys: Boolean(live.apiKey && live.secretKey),
    // Cards are "bientôt disponibles" on KPay's side: off until the admin has
    // made a real payment and switches it on.
    cardEnabled: pick(db.kpayCardEnabled, process.env.KPAY_CARD_ENABLED, 'false') === 'true',
    disabledProviders,
    accountCurrency: pick(db.kpayAccountCurrency, process.env.KPAY_ACCOUNT_CURRENCY, 'CDF').toUpperCase(),
    priceCurrency: pick(db.kpayPriceCurrency, process.env.KPAY_PRICE_CURRENCY, 'CDF').toUpperCase(),
    minAmount: pick(db.kpayMinAmount, process.env.KPAY_MIN_AMOUNT)
  };
}

async function isConfigured() {
  const cfg = await getKpayConfig();
  return cfg.enabled && Boolean(cfg.apiKey && cfg.secretKey);
}

// K-PAY charges in the OPERATOR-COUNTRY currency (the `currency` field is
// derived by K-PAY, never sent). Convert our stored price into the K-PAY
// account/zone currency:
//   priceCurrency   = currency our prices are stored in (default CDF — set
//                     in the admin price inputs).
//   accountCurrency = currency K-PAY settles in (CDF for RDC operators).
// When both match (the common RDC case) NO conversion happens — the price is
// already in the right currency. Otherwise an FX rate is fetched LIVE
// (fxapi.app, cached 1h) with env fallback (KPAY_USD_RATE / KPAY_USD_TO_XAF —
// not exposed in Settings, too niche). USD uses decimals; XAF/XOF/CDF/KES are
// whole units. minAmount = floor.
async function toAccountAmount(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const cfg = await getKpayConfig();
  const account = cfg.accountCurrency;
  const priceCur = cfg.priceCurrency;
  const isDecimal = account === 'USD';

  // Rate to go from priceCur -> account. Same currency = no conversion.
  let rate = 1;
  if (priceCur !== account) {
    if (priceCur === 'USD') rate = await fx.getUsdRate(account);
    else if (account === 'USD') rate = 1 / (await fx.getUsdRate(priceCur));
    // else: no cross-rate available — assume parity.
  }

  let amount = isDecimal ? Math.round(value * rate * 100) / 100 : Math.round(value * rate);
  const min = parseFloat(cfg.minAmount || (isDecimal ? '0.5' : '50')) || (isDecimal ? 0.5 : 50);
  if (amount < min) amount = min;
  return amount;
}

// Card payments are always charged in USD (KPay: min 1 USD for CARD). Convert
// our stored price (priceCurrency) to USD, 2 decimals.
const CARD_MIN_USD = 1;
async function toUsdAmount(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const cfg = await getKpayConfig();
  const rate = cfg.priceCurrency === 'USD' ? 1 : await fx.getUsdRate(cfg.priceCurrency);
  const amount = Math.round((value / rate) * 100) / 100;
  return Math.max(amount, CARD_MIN_USD);
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
async function kpayFetch(path, { method = 'GET', body, retries = 2, timeoutMs } = {}) {
  const cfg = await getKpayConfig();
  const url = `${cfg.baseUrl}/api/v1${path}`;
  const payload = body ? JSON.stringify(body) : undefined;
  const headers = {
    'X-API-Key': cfg.apiKey,
    'X-Secret-Key': cfg.secretKey,
    'Content-Type': 'application/json'
  };
  if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { status, data } = await httpsRequest(url, { method, headers, body: payload, timeoutMs });
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
// Short timeout and no retry: this gates the payment form, it must never hang.
function getAvailability() {
  return kpayFetch('/payments/availability', { retries: 0, timeoutMs: 5000 });
}

// ---------------------------------------------------------------------------
// Local provider blocklist. The availability endpoint does not report an
// operator that simply isn't configured on our KPay account (Airtel RDC today:
// "has not been configured to make deposits using 'AIRTEL_COD'"). When an init
// fails that way we block the operator for 6 h so the next clients never see it
// as selectable. Persisted in the Setting table (JSON) to survive restarts.
// ---------------------------------------------------------------------------
const BLOCKLIST_KEY = 'kpayProviderBlocklist';
const BLOCK_DURATION_MS = 6 * 60 * 60 * 1000;

async function getBlocklist() {
  const row = await prisma.setting.findUnique({ where: { key: BLOCKLIST_KEY } }).catch(() => null);
  let list = {};
  try { list = row ? JSON.parse(row.value) || {} : {}; } catch (_) { list = {}; }
  const now = Date.now();
  // Drop expired entries on read.
  return Object.fromEntries(Object.entries(list).filter(([, v]) => new Date(v.blockedUntil).getTime() > now));
}

async function saveBlocklist(list) {
  const value = JSON.stringify(list);
  await prisma.setting.upsert({
    where: { key: BLOCKLIST_KEY },
    update: { value, type: 'json' },
    create: { key: BLOCKLIST_KEY, value, type: 'json' }
  });
  availabilityCache = null; // reflect immediately
}

async function blockProvider(provider, reason) {
  const list = await getBlocklist();
  list[provider] = {
    reason: String(reason || '').slice(0, 500),
    blockedUntil: new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
  };
  await saveBlocklist(list);
  logger.warn(`K-PAY: provider ${provider} blocklisted for 6h — ${reason}`);
}

async function unblockProvider(provider) {
  const list = await getBlocklist();
  delete list[provider];
  await saveBlocklist(list);
}

// "Operator not usable on this account" errors → blocklist candidates.
function isProviderNotConfiguredError(error) {
  const msg = String(extractApiError(error) || '').toLowerCase();
  return msg.includes('has not been configured') || msg.includes('provider not authorized');
}

// ---------------------------------------------------------------------------
// Client-facing availability summary, cached 60 s. Never throws: when KPay is
// unreachable every operator is reported UNKNOWN so the form stays usable.
// ---------------------------------------------------------------------------
const AVAILABILITY_TTL_MS = 60 * 1000;
let availabilityCache = null; // { at, mode, value }

function mapKpayStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'OPERATIONAL': return 'AVAILABLE';
    case 'DELAYED': return 'DELAYED';
    default: return 'UNAVAILABLE'; // CLOSED or anything unexpected
  }
}

async function getPaymentAvailability() {
  const cfg = await getKpayConfig();
  if (availabilityCache && availabilityCache.mode === cfg.mode &&
      Date.now() - availabilityCache.at < AVAILABILITY_TTL_MS) {
    return availabilityCache.value;
  }

  let cod = null;
  try {
    const data = await getAvailability();
    const countries = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null;
    if (!countries) throw new Error('unexpected availability payload');
    cod = countries.find(c => c.country === 'COD')?.providers || [];
  } catch (err) {
    logger.warn(`K-PAY availability check failed: ${extractApiError(err)}`);
  }

  const blocklist = await getBlocklist();
  const mobileMoney = MOMO_PROVIDERS.map(({ provider, label }) => {
    let status;
    if (cfg.disabledProviders.includes(provider) || blocklist[provider]) {
      status = 'UNAVAILABLE';
    } else if (!cod) {
      status = 'UNKNOWN';
    } else {
      const entry = cod.find(p => p.provider === provider);
      const deposit = entry?.operationTypes?.find(o => o.operationType === 'DEPOSIT');
      // Absent from the answer = operator not enabled on our account.
      status = deposit ? mapKpayStatus(deposit.status) : 'UNAVAILABLE';
    }
    return { provider, label, status };
  });

  const value = {
    checkedAt: new Date().toISOString(),
    environment: cfg.mode === 'TEST' ? 'TEST' : 'PRODUCTION',
    mobileMoney,
    anyMobileMoneyAvailable: mobileMoney.some(m => m.status !== 'UNAVAILABLE'),
    card: { status: cfg.cardEnabled ? 'AVAILABLE' : 'UNAVAILABLE' }
  };
  // Only cache real answers — try KPay again on the next request after a failure.
  if (cod) availabilityCache = { at: Date.now(), mode: cfg.mode, value };
  return value;
}

/**
 * Verify the signed query string KPay appends to returnUrl/cancelUrl:
 *   sig = HMAC-SHA256(gatewaySecret, "status|reference|externalId|ts")
 * Rejected when `ts` is older than 10 min. Display-only: never approve an order
 * on this basis — the webhook / GET /payments/:id are authoritative.
 */
async function verifyGatewayReturn({ status, reference, externalId, ts, sig }) {
  if (!sig || !ts) return false;
  const cfg = await getKpayConfig();
  if (!cfg.gatewaySecret) return false;
  const tsNum = Number(ts);
  const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum; // seconds or milliseconds
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) return false;
  try {
    const expected = crypto.createHmac('sha256', cfg.gatewaySecret)
      .update(`${status || ''}|${reference || ''}|${externalId || ''}|${ts}`)
      .digest('hex');
    const a = Buffer.from(String(sig));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

/**
 * Verify a webhook signature. K-PAY sends HMAC-SHA256 (hex) of the raw JSON
 * body in the `X-KPAY-Signature` header.
 */
async function verifyWebhookSignature(rawBody, signature) {
  // KPay signs with the dashboard webhook secret; fall back to the secret key
  // when no dedicated webhook secret is set (matches the reference integration).
  const cfg = await getKpayConfig();
  if (!signature || !rawBody) return false;
  const secrets = [cfg.webhookSecret || cfg.secretKey, cfg.liveWebhookSecret].filter(Boolean);
  try {
    const a = Buffer.from(String(signature));
    return secrets.some((secret) => {
      const b = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
  } catch (err) {
    logger.error('K-PAY signature verification error:', err);
    return false;
  }
}

module.exports = {
  MOMO_PROVIDERS,
  CARD_MIN_USD,
  getKpayConfig,
  isConfigured,
  toAccountAmount,
  toUsdAmount,
  getPaymentAvailability,
  getBlocklist,
  blockProvider,
  unblockProvider,
  isProviderNotConfiguredError,
  verifyGatewayReturn,
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
  verifyWebhookSignature
};
