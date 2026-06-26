import dns from "node:dns";

// Force la résolution IPv4 d'abord (évite les timeouts de connexion via undici/fetch)
dns.setDefaultResultOrder("ipv4first");

async function initPayment() {
  const res = await fetch("https://admin.kpay.site/api/v1/payments/init", {
    method: "POST",
    headers: {
      "X-API-Key": "kpay_test_bd7b26ae3d6c62769d5dcdba6c57f02cd5a1feb7a24ecfbb",
      "X-Secret-Key": "85fde5dc01bc7a9fc453786ade4458947a5da694dbab76d2988e2b035c1e1319",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 5000,
      externalId: "ORDER-12345",
      returnUrl: "https://kpay.site/payment/return", // URL de retour après paiement
      // En mode GATEWAY, phoneNumber et provider sont saisis par le client
      // sur la page hébergée KPay : ne pas les envoyer ici.
    }),
  });

  const data = await res.json();
  console.log(data);
}

initPayment().catch(console.error);
