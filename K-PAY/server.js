import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { Agent, fetch } from "undici";

// Dispatcher forçant l'IPv4 — évite les timeouts quand l'IPv6 du réseau
// (ex. VPN) est cassé. On utilise le fetch d'undici pour qu'il accepte ce dispatcher.
const ipv4Dispatcher = new Agent({ connect: { family: 4 } });

const {
  KPAY_API_KEY,
  KPAY_SECRET_KEY,
  KPAY_BASE_URL = "https://admin.kpay.site",
  KPAY_WEBHOOK_SECRET,
  PORT = 3000,
  PUBLIC_URL = `http://localhost:${PORT}`,
} = process.env;

if (!KPAY_API_KEY || !KPAY_SECRET_KEY) {
  console.error("❌ KPAY_API_KEY / KPAY_SECRET_KEY manquants dans .env");
  process.exit(1);
}

// --- Catalogue ---
// Le compte de test KPay est en XAF (min 100). On ne peut PAS envoyer de champ
// "currency" : le montant est toujours dans la devise du compte.
const CURRENCY = "XAF";
const PRODUCTS = {
  "invite-basic": { name: "Invitation Basic", amount: 5000 }, // ≈ 10 $
  "invite-premium": { name: "Invitation Premium", amount: 10000 }, // ≈ 20 $
};

// --- "Base de données" en mémoire (à remplacer par une vraie DB) ---
const orders = new Map(); // externalId -> { paymentId, productId, status, ... }

// --- Petit client KPay (avec retry sur timeouts réseau transitoires) ---
async function kpayFetch(path, { method = "GET", body, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${KPAY_BASE_URL}${path}`, {
        method,
        headers: {
          "X-API-Key": KPAY_API_KEY,
          "X-Secret-Key": KPAY_SECRET_KEY,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        dispatcher: ipv4Dispatcher,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || res.statusText;
        throw new Error(`KPay ${res.status}: ${msg}`);
      }
      return data;
    } catch (err) {
      // On ne réessaie que sur les erreurs réseau (pas sur les 4xx métier).
      const transient = err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";
      lastErr = err;
      if (!transient || attempt === retries) throw err;
      console.warn(`↻ retry ${attempt + 1}/${retries} (${err.cause.code})`);
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const kpay = {
  // Mode GATEWAY : le client choisit son opérateur/numéro sur la page KPay.
  initPayment: ({ amount, externalId, returnUrl, cancelUrl, description, metadata }) =>
    kpayFetch("/api/v1/payments/init", {
      method: "POST",
      body: { amount, externalId, returnUrl, cancelUrl, description, metadata },
    }),
  getPayment: (id) => kpayFetch(`/api/v1/payments/${id}`),
};

const app = express();
app.use(express.static("public"));

// On garde le corps BRUT pour vérifier la signature des webhooks,
// tout en exposant le JSON parsé sur req.body.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// 1) Le client clique "Acheter" -> on initialise le paiement et on le redirige.
app.post("/checkout", async (req, res) => {
  try {
    const product = PRODUCTS[req.body.productId];
    if (!product) return res.status(400).json({ error: "Article inconnu" });

    const externalId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const payment = await kpay.initPayment({
      amount: product.amount,
      externalId,
      returnUrl: `${PUBLIC_URL}/payment/return?orderId=${externalId}`,
      cancelUrl: `${PUBLIC_URL}/?cancelled=1`,
      description: product.name,
      metadata: { productId: req.body.productId },
    });

    orders.set(externalId, {
      externalId,
      paymentId: payment.id,
      productId: req.body.productId,
      status: payment.status, // PENDING
      amount: product.amount,
    });

    console.log(`🛒 Paiement créé ${externalId} -> ${payment.id} (${payment.status})`);
    // gatewayUrl = page hébergée KPay où le client paie.
    res.json({ gatewayUrl: payment.gatewayUrl });
  } catch (err) {
    console.error("checkout:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2) KPay renvoie le client ici après paiement -> on vérifie le statut réel.
app.get("/payment/return", async (req, res) => {
  // Si la commande n'est plus en mémoire (redémarrage serveur), on la reconstruit
  // depuis les paramètres de la redirection KPay.
  const order =
    orders.get(req.query.orderId) || {
      externalId: req.query.externalId || req.query.orderId || "—",
      paymentId: null,
      productId: "—",
      amount: "—",
    };

  // KPay ajoute status/reference dans la redirection : utile en repli réseau.
  const fallbackStatus = req.query.status;
  const fallbackRef = req.query.reference;

  let status, reference, confirmed;
  try {
    if (!order.paymentId) throw new Error("paymentId inconnu (commande hors mémoire)");
    // Source de vérité : on interroge l'API.
    const payment = await kpay.getPayment(order.paymentId);
    status = payment.status;
    reference = payment.reference || payment.id;
    confirmed = true;
  } catch (err) {
    // Réseau KO -> on retombe sur les paramètres signés de la redirection.
    console.warn("return: API KO, repli sur les params:", err.message);
    if (!fallbackStatus) {
      return res.status(502).send("Vérification impossible : " + err.message);
    }
    status = fallbackStatus;
    reference = fallbackRef;
    confirmed = false;
  }

  order.status = status;
  const ok = status === "COMPLETED";
  const color = ok ? "#16a34a" : status === "FAILED" ? "#dc2626" : "#d97706";
  const warn = confirmed
    ? ""
    : `<p style="color:#94a3b8;font-size:13px">⚠️ Statut issu de la redirection (API injoignable). Confirmation définitive via webhook.</p>`;

  res.send(`<!doctype html><meta charset="utf-8">
    <body style="font-family:system-ui;max-width:480px;margin:80px auto;text-align:center">
      <h1 style="color:${color}">${ok ? "✅ Paiement réussi" : "Statut : " + status}</h1>
      <p>Commande <b>${order.externalId}</b></p>
      <p>Montant : <b>${order.amount} ${CURRENCY}</b> — ${order.productId}</p>
      <p>Référence KPay : <code>${reference || "—"}</code></p>
      ${warn}
      <a href="/">← Retour à la boutique</a>
    </body>`);
});

// 3) Webhook : KPay nous notifie (source de vérité côté serveur).
app.post("/webhook", (req, res) => {
  const signature = req.get("X-KPAY-Signature");
  const secret = KPAY_WEBHOOK_SECRET || KPAY_SECRET_KEY;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex");

  const valid =
    signature &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    console.warn("⚠️ Webhook signature invalide");
    return res.status(401).send("invalid signature");
  }

  const evt = req.body;
  console.log(`🔔 Webhook ${evt.event} — ${evt.externalId} -> ${evt.status}`);

  // Idempotence : on met à jour la commande si on la connaît.
  const order = orders.get(evt.externalId);
  if (order) order.status = evt.status;

  // Répondre 200 vite ; traiter le reste en asynchrone si besoin.
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Boutique démo : ${PUBLIC_URL}`);
});
