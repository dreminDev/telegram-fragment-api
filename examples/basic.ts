/**
 * End-to-end example. Run with: `npm run example`
 *
 * Fill in your credentials via environment variables (grab the stel_* cookies
 * from an authenticated fragment.com session, and `hash` from any Fragment XHR
 * request — or call `client.auth.fetchHash()` to scrape it).
 *
 * ⚠️  Never commit real credentials.
 */

import { Fragment } from "../src/index.js";

const client = new Fragment({
  hash: process.env.FRAGMENT_HASH,
  stelSsid: process.env.FRAGMENT_STEL_SSID,
  stelDt: process.env.FRAGMENT_STEL_DT ?? "-180",
  stelToken: process.env.FRAGMENT_STEL_TOKEN,
  stelTonToken: process.env.FRAGMENT_STEL_TON_TOKEN,
  toncenterApiKey: process.env.TONCENTER_API_KEY,
  walletSeed: process.env.WALLET_SEED,
});

async function main(): Promise<void> {
  // 1. Resolve a nickname to a recipient hash
  const user = await client.users.nickToHash({ nickname: "maksim_dremin" });
  if (!user.ok) {
    console.error("nickToHash failed:", user.error.code, user.error.message);
    return;
  }
  const recipient = user.data.found!.recipient;
  console.log("Recipient:", recipient);

  // 2. Get the price of Stars
  const price = await client.stars.getPrice({ quantity: 5050 });
  if (price.ok) console.log("5050 stars:", price.data.curPrice);

  // 3. Random TON liteserver (no auth required)
  const lite = await client.ton.getRandomLiteServer();
  if (lite.ok) console.log("Liteserver:", lite.data.ip_readable, lite.data.port);

  // 4. Premium pricing
  const premium = await client.premium.getPrice({ months: 12 });
  if (premium.ok) {
    console.log("TON rate:", premium.data.tonRate);
    for (const opt of premium.data.options) {
      console.log(`  ${opt.duration}: ${opt.priceTon} TON (${opt.priceUsd})`);
    }
  }

  // 5a. High-level — full Stars flow in one call (init → getInfo → send TON →
  // POST Fragment's `confirm_method`). Uncomment to actually buy:
  // const purchase = await client.stars.purchase({ recipient, quantity: 50 });
  // console.log(purchase.ok ? purchase.data : purchase.error);

  // 5b. Or the same flow split into steps, when you need each result:
  const init = await client.stars.initPayment({ recipient, quantity: 50 });
  if (!init.ok) return;

  const info = await client.stars.getPaymentInfo({ requestId: init.data.req_id });
  if (!info.ok) return;

  const message = info.data.transaction!.messages[0]!;
  const decoded = client.utils.decodePayload({ payload: message.payload });
  if (decoded.ok) console.log("Decoded payload:", decoded.data.decoded);

  // Uncomment to actually send TON (spends real funds). After broadcasting
  // you MUST call `confirmPayment` — Fragment only credits Stars once it
  // matches the on-chain BoC to the order.
  // const account = await client.ton.wallet.getAccount();
  // const tx = await client.ton.wallet.v4r2.send({
  //   destinationAddress: message.address,
  //   amountNano: message.amount,   // exact nanoTON straight from Fragment — no /1e9
  //   payloadCell: message.payload, // exact BoC cell — byte-matches the website
  // });
  // if (account.ok && tx.ok && info.data.confirm_method) {
  //   const confirm = await client.stars.confirmPayment({
  //     method: info.data.confirm_method,
  //     params: info.data.confirm_params,
  //     account: account.data,
  //     boc: tx.data.boc,
  //   });
  //   console.log(confirm.ok ? confirm.data : confirm.error);
  // }
}

main().catch(console.error);
