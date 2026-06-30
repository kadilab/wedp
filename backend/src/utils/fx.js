// Live USD → local-currency exchange rates from fxapi.app, cached in memory.
// Used to convert our USD prices to the K-PAY account/operator currency.
const axios = require('axios');
const logger = require('./logger');

const cache = new Map(); // CUR -> { rate, at }
const TTL_MS = 60 * 60 * 1000; // refresh hourly

// Returns how many units of `currency` equal 1 USD. Falls back to a stale cache,
// then KPAY_USD_RATE / KPAY_USD_TO_XAF env, then 1, if the API is unreachable.
async function getUsdRate(currency) {
  const cur = String(currency || '').toUpperCase();
  if (!cur || cur === 'USD') return 1;

  const cached = cache.get(cur);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rate;

  try {
    const { data } = await axios.get(`https://fxapi.app/api/USD/${cur}.json`, { timeout: 8000 });
    const rate = Number(data?.rate);
    if (Number.isFinite(rate) && rate > 0) {
      cache.set(cur, { rate, at: Date.now() });
      return rate;
    }
    throw new Error('invalid rate payload');
  } catch (err) {
    logger.warn(`FX USD->${cur} fetch failed (${err.message}); using fallback`);
    if (cached) return cached.rate; // stale rate beats no rate
    const fb = parseFloat(String(process.env.KPAY_USD_RATE || process.env.KPAY_USD_TO_XAF || '').replace(',', '.'));
    return Number.isFinite(fb) && fb > 0 ? fb : 1;
  }
}

module.exports = { getUsdRate };
