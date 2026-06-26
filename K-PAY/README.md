# Intégration KPay — Guide complet

> Document de référence pour intégrer le paiement **KPay** (Mobile Money) dans un projet Node.js.
> Rédigé à partir d'une intégration réelle testée de bout en bout en **mode TEST**.
> Donne ce fichier à ta session de dev : il contient tout (auth, pièges réseau, endpoints, webhooks, code prêt à copier).

---

## 0. TL;DR (l'essentiel en 1 minute)

1. **Auth** : 2 en-têtes sur chaque requête → `X-API-Key` + `X-Secret-Key`.
2. **Base URL unique** : `https://admin.kpay.site` (c'est la **clé** `kpay_test_` vs `kpay_live_` qui choisit l'environnement, pas l'URL).
3. **Piège réseau Node** ⚠️ : `fetch` natif peut faire des `UND_ERR_CONNECT_TIMEOUT` si l'IPv6 du réseau est cassé (VPN…). **Solution : forcer l'IPv4** via un dispatcher `undici` (voir §5).
4. **Mode recommandé : GATEWAY** → tu envoies `amount` + `returnUrl`, le client choisit opérateur/numéro sur la page hébergée KPay. Tu le rediriges vers `gatewayUrl`.
5. **Devise = celle du compte** (ici **XAF**, min **100**). ⛔ Ne **PAS** envoyer de champ `currency` (rejeté).
6. **`externalId` unique** par commande (sinon erreur `409`).
7. **Source de vérité = le WEBHOOK** (serveur-à-serveur, signé HMAC). La page de retour ne sert qu'à informer le client.

---

## 1. Prérequis & configuration

- **Node.js ≥ 18** (testé sur Node 24).
- Dépendances : `express`, `dotenv`, `undici`.

```bash
npm install express dotenv undici
```

### Fichier `.env`

```ini
# Clés KPay (TEST). En prod : kpay_live_... / sk_live_...
KPAY_API_KEY=kpay_test_xxxxxxxxxxxxxxxx
KPAY_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
KPAY_BASE_URL=https://admin.kpay.site

# URL publique de TON app (pour returnUrl / webhook)
PUBLIC_URL=https://winvite.pro/
PORT=80

# Secret de signature des webhooks (fourni dans le dashboard KPay)
KPAY_WEBHOOK_SECRET=
```

> 🔐 **Ne jamais committer `.env`.** Ajoute-le à `.gitignore`. Ne mets jamais la clé secrète côté front.

---

## 2. Authentification

Toutes les requêtes authentifiées portent ces 2 en-têtes :

| Header | Description | Préfixe TEST | Préfixe LIVE |
|---|---|---|---|
| `X-API-Key` | Clé publique | `kpay_test_` | `kpay_live_` |
| `X-Secret-Key` | Clé secrète | `sk_test_` | `sk_live_` |

- **TEST (Sandbox)** : aucun argent réel déplacé.
- **LIVE (Production)** : nécessite la validation KYC depuis le dashboard.

Erreurs d'auth : `401` (clé manquante/invalide), `403` (ressource non autorisée).

---

## 3. Modes de paiement

### GATEWAY (recommandé — le plus simple)
KPay héberge la page de paiement. Le client y saisit lui-même opérateur + numéro.

- **Envoyer** : `amount`, `externalId`, `returnUrl` (requis), `cancelUrl` (optionnel).
- ⛔ **Ne PAS envoyer** : `phoneNumber`, `provider`, `paymentMethod`, `customerName`.
- **Réponse** contient `gatewayUrl` → rediriger le client dessus, et `expiresAt`.

### USSD (Direct)
Tu fournis toi-même le numéro et l'opérateur ; le client valide sur son téléphone.

- **Envoyer** : `amount`, `provider`, `phoneNumber`, `externalId`.

> Ce guide utilise **GATEWAY** (idéal pour un paiement web : invitations, e-commerce…).

---

## 4. Endpoints utilisés

| Action | Méthode + chemin |
|---|---|
| Initier un paiement | `POST /api/v1/payments/init` → **201** |
| Statut d'un paiement | `GET /api/v1/payments/:id` |
| Initier un retrait | `POST /api/v1/payments/withdraw` |
| Statut d'un retrait | `GET /api/v1/payments/withdraw/:id` |
| Infos appli/compte | `GET /api/v1/payments/me` |
| Solde wallet | `GET /api/v1/payments/balance` |
| Prédire l'opérateur d'un numéro | `POST /api/v1/payments/predict-provider` |
| Disponibilité des opérateurs | `GET /api/v1/payments/availability` |
| Taux de change | `GET /api/v1/payments/exchange-rate?from=XAF&to=XOF` |

### Champs `POST /payments/init`

**Requis (GATEWAY)** : `amount` (number, ≥ min du compte), `externalId` (string unique), `returnUrl` (string).
**Optionnels** : `cancelUrl`, `description`, `customerEmail`, `metadata` (objet JSON renvoyé partout, dont dans le webhook).

### Statuts d'un paiement
`PENDING` → `PROCESSING` → **terminal** : `COMPLETED` | `FAILED` | `CANCELLED`.

---

## 5. ⚠️ Le piège réseau à connaître absolument (IPv4)

Sur certains réseaux (VPN, DNS IPv6), le `fetch` natif de Node échoue avec :

```
TypeError: fetch failed
  [cause]: ConnectTimeoutError ... code: 'UND_ERR_CONNECT_TIMEOUT'
```

…alors que `curl --ipv4` fonctionne. Cause : l'IPv6 du réseau est cassé et undici reste bloqué dessus.

**Solution robuste : forcer l'IPv4 via un dispatcher `undici`.** Il faut importer `fetch` **depuis `undici`** (le `fetch` natif refuse un dispatcher externe avec `UND_ERR_INVALID_ARG`) :

```js
import { Agent, fetch } from "undici";

const ipv4Dispatcher = new Agent({ connect: { family: 4 } });

// puis sur CHAQUE appel :
await fetch(url, { /* ... */, dispatcher: ipv4Dispatcher });
```

> Le client KPay du §6 intègre déjà ce correctif + un retry sur timeout transitoire.

---

## 6. Client KPay réutilisable (à copier dans le projet)

`kpay.js` :

```js
import { Agent, fetch } from "undici";

const {
  KPAY_API_KEY,
  KPAY_SECRET_KEY,
  KPAY_BASE_URL = "https://admin.kpay.site",
} = process.env;

// Force IPv4 (évite les timeouts undici quand l'IPv6 du réseau est cassé).
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

export const kpay = {
  // GATEWAY : le client choisit opérateur/numéro sur la page KPay.
  initPayment: ({ amount, externalId, returnUrl, cancelUrl, description, metadata }) =>
    kpayFetch("/api/v1/payments/init", {
      method: "POST",
      body: { amount, externalId, returnUrl, cancelUrl, description, metadata },
    }),
  getPayment: (id) => kpayFetch(`/api/v1/payments/${id}`),
  getBalance: () => kpayFetch("/api/v1/payments/balance"),
};
```

---

## 7. Flux d'intégration (3 étapes)

### Étape A — Lancer le paiement (au clic « Payer »)

```js
import crypto from "node:crypto";
import { kpay } from "./kpay.js";

// 1. Générer un externalId UNIQUE et l'associer à ta commande en base.
const externalId = `ORDER-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

// 2. Initier le paiement.
const payment = await kpay.initPayment({
  amount: 5000,                 // dans la devise du compte (XAF), min 100
  externalId,
  returnUrl: `${process.env.PUBLIC_URL}/payment/return?orderId=${externalId}`,
  cancelUrl: `${process.env.PUBLIC_URL}/?cancelled=1`,
  description: "Invitation Premium",
  metadata: { orderId: externalId, productId: "invite-premium" },
});

// 3. Enregistrer payment.id <-> externalId en base (statut PENDING).
// 4. Rediriger le client :
//    res.redirect(payment.gatewayUrl)   ou renvoyer { gatewayUrl } au front.
```

### Étape B — Page de retour (UX uniquement)

KPay redirige le client vers ton `returnUrl` en y ajoutant `status`, `reference`, `externalId`, `ts`, `sig`.
**N'accorde JAMAIS le produit ici** (le client peut fermer l'onglet ou trafiquer l'URL). Sert-toi-en seulement pour afficher un message, et reconfirme via l'API si possible :

```js
app.get("/payment/return", async (req, res) => {
  const order = findOrderByExternalId(req.query.orderId); // ta base
  let status = req.query.status; // repli si l'API est injoignable
  try {
    if (order?.paymentId) status = (await kpay.getPayment(order.paymentId)).status;
  } catch (_) { /* réseau KO -> on garde le status de la redirection */ }
  res.send(`Statut : ${status} — la confirmation finale arrive par webhook.`);
});
```

> ℹ️ Le `sig` de la redirection n'a pas de schéma documenté fiable → **ne te base pas dessus** pour valider. Utilise le webhook.

### Étape C — Webhook (SOURCE DE VÉRITÉ ✅)

C'est **ici** que tu confirmes la commande et délivres le produit (l'invitation).

```js
import crypto from "node:crypto";
import express from "express";

const app = express();

// IMPORTANT : garder le corps BRUT pour vérifier la signature HMAC.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

app.post("/webhook", (req, res) => {
  const signature = req.get("X-KPAY-Signature");
  const secret = process.env.KPAY_WEBHOOK_SECRET; // depuis le dashboard KPay
  const expected = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");

  // Comparaison à temps constant (anti-timing-attack).
  const valid =
    signature &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) return res.status(401).send("invalid signature");

  const evt = req.body; // { event, paymentId, reference, status, amount, externalId, metadata, ... }

  // Idempotence : ignorer si déjà traité (le webhook peut être renvoyé).
  if (alreadyProcessed(evt.externalId)) return res.sendStatus(200);

  if (evt.event === "payment.completed" && evt.status === "COMPLETED") {
    // ✅ Délivrer le produit ici : marquer la commande payée, créer l'invitation…
    fulfillOrder(evt.externalId, evt);
  }

  // Répondre 200 RAPIDEMENT ; faire le travail lourd en asynchrone.
  res.sendStatus(200);
});
```

**Configuration côté KPay** : dans le dashboard, renseigne l'URL publique de ton webhook (jusqu'à 4 URLs : générique + dépôts/retraits/refunds). En local, expose ton serveur avec un tunnel :

```bash
npx ngrok http 3000      # -> mets l'URL https://xxxx.ngrok.io/webhook dans le dashboard
```

#### Événements webhook
| Catégorie | Événements |
|---|---|
| Dépôts | `payment.completed`, `payment.failed`, `payment.cancelled` |
| Retraits | `payout.completed`, `payout.failed`, `payout.cancelled` |
| Remboursements | `refund.completed`, `refund.failed`, `refund.cancelled` |

#### Payload webhook (champs principaux)
`event`, `paymentId`, `reference`, `status`, `amount`, `phoneNumber`, `externalId`, `metadata`, `completedAt`/`failedAt`, `failureReason`, `timestamp`.

#### Bonnes pratiques webhook
- Répondre **200** vite, traiter en asynchrone.
- **Idempotence** sur `paymentId`/`externalId` (retries possibles : 1s, 2s, 4s).
- HTTPS avec certificat valide.

---

## 8. Tester en Sandbox

### Devise & montants (compte de test utilisé)
- Devise : **XAF**. Montant **minimum : 100**.
- ⛔ Le champ `currency` est **interdit** (`property currency should not exist`). Le montant est **toujours** dans la devise du compte.

### Numéros de test (Cameroun, opérateurs `MTN_MOMO_CMR` / `ORANGE_CMR`, mode TEST uniquement)

**Paiements (dépôts) :**
| Numéro | Résultat |
|---|---|
| `237653456789` | ✅ COMPLETED |
| `237653456019` | ❌ FAILED — PAYER_LIMIT_REACHED |
| `237653456029` | ❌ FAILED — PAYER_NOT_FOUND |
| `237653456039` | ❌ FAILED — PAYMENT_NOT_APPROVED |
| `237653456069` | ❌ FAILED — UNSPECIFIED_FAILURE |
| `237653456129` | ⏳ SUBMITTED (en attente) |

**Retraits :**
| Numéro | Résultat |
|---|---|
| `237653456789` | ✅ COMPLETED |
| `237653456089` | ❌ FAILED — RECIPIENT_NOT_FOUND |
| `237653456119` | ❌ FAILED — UNSPECIFIED_FAILURE |
| `237653456129` | ⏳ SUBMITTED |

> En mode GATEWAY, le client saisit son numéro sur la page KPay : utilise ces numéros là.

---

## 9. Opérateurs supportés (codes `provider` pour le mode USSD)

23 opérateurs dans 12 pays. Extrait :

| Pays | Opérateur | Code | Devise |
|---|---|---|---|
| Cameroun (+237) | MTN | `MTN_MOMO_CMR` | XAF |
| Cameroun | Orange | `ORANGE_CMR` | XAF |
| Côte d'Ivoire (+225) | MTN / Orange | `MTN_MOMO_CIV` / `ORANGE_CIV` | XOF |
| RDC (+243) | Vodacom M-Pesa | `VODACOM_MPESA_COD` | CDF/USD |
| RDC | Airtel / Orange | `AIRTEL_COD` / `ORANGE_COD` | CDF/USD |
| Bénin (+229) | MTN / Moov | `MTN_MOMO_BEN` / `MOOV_BEN` | XOF |
| Sénégal (+221) | Orange / Free | `ORANGE_SEN` / `FREE_SEN` | XOF |
| Kenya (+254) | M-Pesa | `MPESA_KEN` | KES |
| Rwanda (+250) | MTN / Airtel | `MTN_MOMO_RWA` / `AIRTEL_RWA` | RWF |
| Ouganda (+256) | MTN / Airtel | `MTN_MOMO_UGA` / `AIRTEL_OAPI_UGA` | UGX |
| Zambie (+260) | MTN / Airtel / Zamtel | `MTN_MOMO_ZMB` / `AIRTEL_OAPI_ZMB` / `ZAMTEL_ZMB` | ZMW |

> En GATEWAY, pas besoin du code `provider` (le client choisit). Pour la liste à jour, voir `GET /payments/availability` ou la doc.

---

## 10. Gestion des erreurs

Format de réponse d'erreur :
```json
{ "statusCode": 400, "message": "Description lisible", "error": "Bad Request" }
```

| Code | Sens | À faire |
|---|---|---|
| 400 | Bad Request | Vérifier les champs (montant < min, champ interdit `currency`, etc.) |
| 401 | Unauthorized | Clés manquantes/invalides ou mauvais environnement |
| 403 | Forbidden | Ressource non autorisée |
| 404 | Not Found | ID inconnu |
| 409 | Conflict | **`externalId` en doublon** → en régénérer un |
| 422 | Unprocessable | Données invalides (ex. retrait : solde insuffisant) |
| 429 | Too Many Requests | Rate limit → backoff exponentiel |
| 500 | Server Error | Réessayer avec backoff |

**Rate limits** : 100 req/min global · 20/min pour l'init GATEWAY · 60/min pour le polling de statut.

**Retry** : réessayer uniquement sur erreurs réseau / `429` / `5xx` (backoff exponentiel). Jamais sur les `4xx` métier.

---

## 11. Checklist d'intégration

- [ ] `npm install express dotenv undici`
- [ ] `.env` rempli (clés TEST) + `.env` dans `.gitignore`
- [ ] Copier `kpay.js` (§6) avec le dispatcher IPv4
- [ ] Route « payer » → `kpay.initPayment(...)` → rediriger vers `gatewayUrl`
- [ ] Sauvegarder `paymentId ↔ externalId ↔ commande` en base
- [ ] Route `/payment/return` (affichage UX seulement)
- [ ] Route `/webhook` avec vérif HMAC + idempotence → **délivrer le produit ici**
- [ ] Exposer le webhook (ngrok en local) + configurer l'URL dans le dashboard KPay
- [ ] Renseigner `KPAY_WEBHOOK_SECRET`
- [ ] Tester avec `237653456789` (succès) et `237653456019` (échec)
- [ ] Passer en LIVE : clés `kpay_live_`/`sk_live_` après KYC

---

## 12. Pièges à éviter (résumé)

1. ❌ Envoyer un champ `currency` → rejeté. Le montant est dans la devise du compte.
2. ❌ Montant sous le minimum (100 XAF ici) → `400`.
3. ❌ Réutiliser un `externalId` → `409`.
4. ❌ Passer un dispatcher au `fetch` natif → `UND_ERR_INVALID_ARG`. Importer `fetch` depuis `undici`.
5. ❌ Timeouts `UND_ERR_CONNECT_TIMEOUT` → forcer l'IPv4 (VPN/IPv6 cassé).
6. ❌ Délivrer le produit depuis la page de retour → **utiliser le webhook** (source de vérité).
7. ❌ Oublier de garder le `rawBody` → impossible de vérifier la signature du webhook.
