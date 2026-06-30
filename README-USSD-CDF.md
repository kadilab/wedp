# Intégration KPay — Mode DIRECT (USSD) en CDF / FC

> Guide d'intégration du paiement **Mobile Money RDC** via **KPay**, en mode **DIRECT (USSD)**, avec encaissement en **Franc Congolais (CDF, affiché « FC »)**.
> ✅ Testé en production : un paiement réel **AIRTEL_COD** est bien passé en **CDF** (montant 1000, frais 40, net 960).
> Donne ce fichier à ta session de dev pour intégrer le paiement dans l'application **Winvite.pro**.

---

## 0. TL;DR

1. **Mode DIRECT** : TON application collecte le **numéro** + l'**opérateur**, puis appelle KPay. Le client valide par **USSD** sur son téléphone (pas de page hébergée).
2. ⚠️ **Le mode DIRECT doit être activé sur l'application côté dashboard KPay** (déjà fait pour Winvite.pro). Sinon → `400 "In GATEWAY mode..."`.
3. **Devise = dérivée de l'opérateur**, jamais envoyée. Opérateur RDC → **CDF**. ⛔ Ne PAS envoyer de champ `currency`.
4. **Affichage** : montrer « **FC** » au client ; le code devise réel de KPay reste **CDF**.
5. **Auth** : en-têtes `X-API-Key` + `X-Secret-Key` (clés `kpay_live_` en prod).
6. **Piège réseau** : forcer l'IPv4 via `undici` (voir §3).
7. **Source de vérité = webhook** (HMAC). C'est là qu'on délivre l'invitation.

---

## 1. Différence GATEWAY vs DIRECT (important)

| | GATEWAY | **DIRECT (USSD)** ← ce guide |
|---|---|---|
| Qui saisit numéro/opérateur | Le client, sur la page **hébergée KPay** | **Ton app** (ton propre formulaire) |
| Redirection | Oui → `gatewayUrl` | **Non**, tout reste chez toi |
| Champs envoyés | `amount`, `returnUrl` | `amount`, `provider`, `phoneNumber` |
| Devise | Devise de base du compte (XAF) | **Suit l'opérateur** → CDF pour la RDC |
| Activation | Par défaut | **À activer dans le dashboard KPay** |

> Le mode est une **config de l'application** dans KPay, PAS quelque chose qu'on choisit par requête.

---

## 2. Configuration

```bash
npm install express dotenv undici
```

`.env` (ne jamais committer) :

```ini
KPAY_API_KEY=kpay_live_xxxxxxxxxxxxxxxx
KPAY_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
KPAY_BASE_URL=https://admin.kpay.site
KPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx   # depuis le dashboard KPay
PUBLIC_URL=https://winvite.pro
PORT=3000
```

---

## 3. Client KPay (mode DIRECT + fix réseau IPv4)

`kpay.js` :

```js
import { Agent, fetch } from "undici";

const {
  KPAY_API_KEY,
  KPAY_SECRET_KEY,
  KPAY_BASE_URL = "https://admin.kpay.site",
} = process.env;

// Force IPv4 — évite les UND_ERR_CONNECT_TIMEOUT quand l'IPv6 du réseau est cassé.
// NB: importer fetch DEPUIS undici (le fetch natif refuse un dispatcher externe).
const ipv4Dispatcher = new Agent({ connect: { family: 4 } });

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
      if (!res.ok) throw new Error(`KPay ${res.status}: ${data?.message || res.statusText}`);
      return data;
    } catch (err) {
      lastErr = err;
      const transient = err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";
      if (!transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Opérateurs Mobile Money RDC (paiement en CDF).
export const RDC_PROVIDERS = {
  AIRTEL_COD: "Airtel Money",
  ORANGE_COD: "Orange Money",
  VODACOM_MPESA_COD: "M-Pesa (Vodacom)",
};

export const kpay = {
  // DIRECT : on fournit provider + numéro ; le client valide en USSD.
  initDirect: ({ amount, provider, phoneNumber, externalId, description, metadata }) =>
    kpayFetch("/api/v1/payments/init", {
      method: "POST",
      body: { amount, provider, phoneNumber, externalId, description, metadata },
    }),
  getPayment: (id) => kpayFetch(`/api/v1/payments/${id}`),
};
```

---

## 4. Backend — routes à intégrer dans ton app

```js
import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { kpay, RDC_PROVIDERS } from "./kpay.js";

const app = express();
// IMPORTANT : garder le corps BRUT pour vérifier la signature du webhook.
app.use(express.json({ verify: (req, _r, buf) => { req.rawBody = buf; } }));

// Remplace par ta vraie logique de prix / commande.
const PRICES = { "invite-basic": 1000, "invite-premium": 2000 }; // en CDF (affiché "FC")
const orders = new Map(); // -> remplace par ta base de données

// 1) Lancer le paiement DIRECT
app.post("/checkout", async (req, res) => {
  try {
    const { productId, phoneNumber, provider } = req.body;
    const amount = PRICES[productId];
    if (!amount) return res.status(400).json({ error: "Article inconnu" });
    if (!RDC_PROVIDERS[provider]) return res.status(400).json({ error: "Opérateur invalide" });

    // Numéro RDC : chiffres only, doit commencer par 243 + 9 chiffres.
    const phone = String(phoneNumber || "").replace(/\D/g, "");
    if (!/^243\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Numéro RDC invalide (243XXXXXXXXX)" });
    }

    const externalId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const payment = await kpay.initDirect({
      amount, provider, phoneNumber: phone, externalId,
      description: productId, metadata: { productId },
    });

    orders.set(externalId, { paymentId: payment.id, productId, status: payment.status });
    res.json({ orderId: externalId, status: payment.status });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 2) Polling du statut (le front interroge tant que PENDING/PROCESSING)
app.get("/payment/status", async (req, res) => {
  const order = orders.get(req.query.orderId);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  try {
    const p = await kpay.getPayment(order.paymentId);
    order.status = p.status;
    res.json({ status: p.status, currency: p.currency, reference: p.reference, failureReason: p.failureReason });
  } catch {
    res.json({ status: order.status, pendingNetwork: true });
  }
});

// 3) Webhook — SOURCE DE VÉRITÉ : on délivre l'invitation ICI
app.post("/webhook", (req, res) => {
  const signature = req.get("X-KPAY-Signature");
  const expected = crypto
    .createHmac("sha256", process.env.KPAY_WEBHOOK_SECRET)
    .update(req.rawBody).digest("hex");
  const valid = signature && signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return res.status(401).send("invalid signature");

  const evt = req.body; // { event, externalId, status, amount, ... }
  const order = orders.get(evt.externalId);
  if (order) order.status = evt.status;

  if (evt.event === "payment.completed" && evt.status === "COMPLETED") {
    // ✅ Idempotent : délivrer l'invitation (créer/activer + envoyer au client).
    // fulfillInvitation(evt.externalId, evt);
  }
  res.sendStatus(200); // répondre 200 vite
});

app.listen(process.env.PORT || 3000);
```

---

## 5. Frontend — formulaire numéro + opérateur

Pour chaque article, afficher un `<select>` opérateur + un champ numéro, puis poller le statut :

```html
<select id="prov">
  <option value="AIRTEL_COD">Airtel Money</option>
  <option value="ORANGE_COD">Orange Money</option>
  <option value="VODACOM_MPESA_COD">M-Pesa (Vodacom)</option>
</select>
<input id="phone" inputmode="numeric" placeholder="243XXXXXXXXX" />
<button onclick="pay('invite-basic')">Payer (1 000 FC)</button>
<div id="status"></div>

<script>
async function pay(productId) {
  const phoneNumber = document.getElementById("phone").value.trim();
  const provider = document.getElementById("prov").value;
  const statusEl = document.getElementById("status");
  statusEl.textContent = "Initialisation…";

  const res = await fetch("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, phoneNumber, provider }),
  });
  const data = await res.json();
  if (!res.ok) { statusEl.textContent = "❌ " + data.error; return; }

  statusEl.textContent = "📲 Valide la demande sur ton téléphone…";
  const timer = setInterval(async () => {
    const s = await (await fetch("/payment/status?orderId=" + data.orderId)).json();
    if (s.status === "COMPLETED") { clearInterval(timer); statusEl.textContent = "✅ Paiement réussi (" + s.currency + ")"; }
    else if (["FAILED","CANCELLED"].includes(s.status)) { clearInterval(timer); statusEl.textContent = "❌ " + s.status; }
    else statusEl.textContent = "⏳ " + s.status + "…";
  }, 3000);
}
</script>
```

> 💡 Affiche « **FC** » au client. Le code devise renvoyé par l'API (`s.currency`) est **CDF** — c'est la même monnaie.

---

## 6. Statuts & flux

```
POST /checkout
   → init DIRECT (provider RDC) → PENDING
   → 📲 demande USSD sur le téléphone du client
   → PROCESSING (validation opérateur)
   → COMPLETED  ✅  (ou FAILED / CANCELLED)
        └─ webhook payment.completed → délivrer l'invitation
```

| Statut | Sens |
|---|---|
| `PENDING` | Demande créée, en attente de validation client |
| `PROCESSING` | En cours côté opérateur |
| `COMPLETED` | ✅ Payé |
| `FAILED` / `CANCELLED` | ❌ Échec / annulé (`failureReason`) |

---

## 7. Réponse `GET /payments/:id` (exemple réel testé)

```json
{
  "status": "PROCESSING",
  "amount": 1000,
  "currency": "CDF",
  "netAmount": 960,
  "feeAmount": 40,
  "provider": "AIRTEL_COD",
  "country": "COD",
  "phoneNumber": "243972688605"
}
```

> Frais KPay prélevés sur le montant : ici **40 CDF** de frais → **960 CDF** nets.

---

## 8. Webhook en production

- Configure l'URL `https://winvite.pro/webhook` dans le dashboard KPay (jusqu'à 4 URLs : générique + dépôts/retraits/refunds).
- En local pour tester : `npx ngrok http 3000` puis mets l'URL ngrok dans le dashboard.
- Événements dépôts : `payment.completed`, `payment.failed`, `payment.cancelled`.
- Payload : `event`, `paymentId`, `reference`, `status`, `amount`, `phoneNumber`, `externalId`, `metadata`, `failureReason`, `timestamp`.
- **Idempotence obligatoire** (le webhook peut être renvoyé : 1s, 2s, 4s). Réponds **200** vite.

---

## 9. Pièges à éviter

1. ❌ Mode DIRECT non activé sur l'app → `400 "In GATEWAY mode..."`. (À activer dans le dashboard KPay.)
2. ❌ Envoyer `currency` → `400 "property currency should not exist"`. La devise suit l'opérateur.
3. ❌ Montant < 50 → `400`.
4. ❌ Réutiliser un `externalId` → `409`. En générer un unique par commande.
5. ❌ Passer un dispatcher au `fetch` natif → `UND_ERR_INVALID_ARG`. Importer `fetch` depuis `undici`.
6. ❌ Timeouts `UND_ERR_CONNECT_TIMEOUT` → forcer l'IPv4 (VPN/IPv6 cassé).
7. ❌ Trop de requêtes rapprochées sur l'API live → **blocage IP temporaire** (timeout, pas de 429). Se lève après quelques minutes.
8. ❌ Délivrer l'invitation depuis le polling/page → utiliser le **webhook** (source de vérité).
9. ❌ Oublier de garder `rawBody` → impossible de vérifier la signature du webhook.

---

## 10. Checklist pour l'autre application

- [ ] `npm install express dotenv undici`
- [ ] `.env` avec clés `kpay_live_` + `KPAY_WEBHOOK_SECRET`
- [ ] Copier `kpay.js` (§3)
- [ ] Route `POST /checkout` (numéro + opérateur + validation 243) (§4)
- [ ] Route `GET /payment/status` (polling) (§4)
- [ ] Route `POST /webhook` (HMAC + idempotence → livrer l'invitation) (§4)
- [ ] Formulaire front : `<select>` opérateur + champ numéro (§5)
- [ ] Afficher « **FC** » au client (devise API = CDF)
- [ ] Configurer l'URL webhook dans le dashboard KPay
- [ ] Tester avec ton propre numéro RDC (argent réel en prod)
- [ ] Mettre les **vrais prix** (pas les 1000/2000 de test)
```
