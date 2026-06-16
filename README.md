<div align="center">

# 🧩 telegram-fragment-api

**Unofficial, fully-typed TypeScript client for [Fragment.com](https://fragment.com)**

Buy Telegram Stars, check Premium prices, resolve usernames and move TON — class-based, `Result`-safe, no exceptions.

[![npm version](https://img.shields.io/npm/v/telegram-fragment-api?color=cb3837&logo=npm)](https://www.npmjs.com/package/telegram-fragment-api)
[![npm downloads](https://img.shields.io/npm/dm/telegram-fragment-api?color=cb3837&logo=npm)](https://www.npmjs.com/package/telegram-fragment-api)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/dreminDev/telegram-fragment-api?style=social)](https://github.com/dreminDev/telegram-fragment-api)

**English** · [Русский](./README.ru.md)

</div>

---

> ### ⭐ Enjoying this library?
> **Please [star the repository on GitHub](https://github.com/dreminDev/telegram-fragment-api)** — it takes one click, costs you nothing, and genuinely helps the project grow and get maintained. Thank you! 🙏

---

## ✨ Features

- 🏛️ **Class-based, namespaced API** — `client.stars.getPrice({ quantity })`, `client.ton.wallet.v4r2.send({ … })`
- 🧯 **No exceptions** — every method returns a `Result` (`{ ok: true, data } | { ok: false, error }`)
- 🧩 **Typed errors** — structured `FragmentError` with a `code` (`VALIDATION`, `AUTH`, `NETWORK`, `API`, …)
- 🔭 **Username lookup**, ⭐ **Stars** pricing + purchase flow, 👑 **Premium** prices
- 💎 **TON blockchain** — liteservers, wallet balances, and **v4r2 transfers**
- 🔑 **Auto hash** — scrape the per-session api hash with `client.auth.fetchHash()`
- 🧾 **Payload decoder**, 👤 **profile & sessions**
- 🟦 **100% TypeScript** + 🧪 **fully mock-tested** (Vitest), ESM **and** CommonJS, powered by **axios**

## 📦 Installation

```bash
npm install telegram-fragment-api
```

> Requires **Node.js ≥ 18**.

## 🚀 Quick start

```ts
import { Fragment } from "telegram-fragment-api";

// Create a client with your credentials (see "Getting credentials" below)
const client = new Fragment({
  hash: "your_hash_here",
  stelSsid: "your_stel_ssid",
  stelToken: "your_stel_token",
  stelTonToken: "your_stel_ton_token",
  toncenterApiKey: "your_toncenter_api_key",
  walletSeed: "word1 word2 ... word24",
});

const res = await client.stars.getPrice({ quantity: 5050 });
if (res.ok) {
  console.log(res.data.curPrice); // { TON: "...", USDT: "..." }
} else {
  console.error(res.error.code, res.error.message);
}
```

> **CommonJS?** `const { Fragment } = require("telegram-fragment-api");` works too — dual ESM/CJS builds.

## 🧯 Error handling — the `Result` pattern

No method ever throws. Each returns a discriminated union you narrow with `res.ok`:

```ts
const res = await client.users.nickToHash({ nickname: "durov" });

if (res.ok) {
  // res.data is fully typed here
  console.log(res.data.found?.recipient);
} else {
  // res.error is a FragmentError
  switch (res.error.code) {
    case "AUTH":      /* bad cookies / hash */ break;
    case "NOT_FOUND": /* username has no recipient */ break;
    case "NETWORK":   /* timeout / connection */ break;
    default:          console.error(res.error.message);
  }
}
```

Error codes: `VALIDATION` · `AUTH` · `NETWORK` · `API` · `PARSE` · `NOT_FOUND` · `INSUFFICIENT_FUNDS` · `UNKNOWN`.

## 🔑 Getting credentials

| Field | Where to get it |
|---|---|
| `hash` | The `hash` query param on any `fragment.com/api` XHR request — or call `client.auth.fetchHash()` |
| `stelSsid`, `stelToken`, `stelTonToken` | Cookies on `fragment.com` (DevTools → Application → Cookies) |
| `stelDt` | Cookie `stel_dt` (timezone offset, usually `"-180"`) |
| `toncenterApiKey` | Free key from [@tonapibot](https://t.me/tonapibot) / [toncenter.com](https://toncenter.com) |
| `tonconsoleApiKey` | Alternative balance source — [tonconsole.com](https://tonconsole.com) (tonapi.io) |
| `walletSeed` | Your wallet's 24-word mnemonic — **required only for sending TON** |

> 🔒 **Security:** treat these like passwords. Load them from environment variables, never hard-code or commit them. Anyone with your `walletSeed` can drain your wallet.

You can also update credentials after construction:

```ts
client.configure({ hash: "new_hash" });
await client.auth.fetchHash(); // scrapes & stores the hash automatically
```

## 📚 API reference

Every network call returns a `Promise<Result<T>>`.

### `client.users` / `client.utils`

```ts
await client.users.nickToHash({ nickname: "durov" });        // → recipient hash
client.utils.decodePayload({ payload: "te6ccg..." });        // → { decoded } (sync)
```

### `client.stars`

```ts
await client.stars.getPrice({ quantity: 5050 });             // → { curPrice: { TON, USDT } }
await client.stars.initPayment({ recipient, quantity: 50 }); // → { req_id, amount }
await client.stars.getPaymentInfo({ requestId });            // → { transaction: { messages } }
```

### `client.premium`

```ts
const res = await client.premium.getPrice({ months: 12 });
if (res.ok) console.log(res.data.tonRate, res.data.options);
```

### `client.ton`

```ts
await client.ton.getRandomLiteServer();                          // → { ip_readable, port }
await client.ton.wallet.getBalance({ address: "UQ..." });        // → { nano, ton, source }

await client.ton.wallet.v4r2.send({
  destinationAddress: "UQCVVC0g...",
  amount: 0.21,                          // in TON
  payload: "50 Telegram Stars\n\nRef#Im2y5itd6",
});                                                              // → { sender, balanceBefore, ... }
```

### `client.account`

```ts
await client.account.getProfile();   // → { username, verified, wallet, ... }
await client.account.getSessions();  // → { account, sessions: [...] }
```

### `client.auth`

```ts
await client.auth.fetchHash();                       // scrape hash from fragment.com/
await client.auth.fetchHash({ url: ".../stars" });   // from a specific page
```

## 🔗 Full workflow: buy Stars end-to-end

```ts
import { Fragment } from "telegram-fragment-api";

const client = new Fragment({
  hash: process.env.FRAGMENT_HASH!,
  stelSsid: process.env.FRAGMENT_STEL_SSID!,
  stelToken: process.env.FRAGMENT_STEL_TOKEN!,
  stelTonToken: process.env.FRAGMENT_STEL_TON_TOKEN!,
  toncenterApiKey: process.env.TONCENTER_API_KEY!,
  walletSeed: process.env.WALLET_SEED!,
});

const user = await client.users.nickToHash({ nickname: "kompromizzdev" });
if (!user.ok) throw new Error(user.error.message);

const init = await client.stars.initPayment({
  recipient: user.data.found!.recipient,
  quantity: 50,
});
if (!init.ok) throw new Error(init.error.message);

const info = await client.stars.getPaymentInfo({ requestId: init.data.req_id });
if (!info.ok) throw new Error(info.error.message);

const msg = info.data.transaction!.messages[0]!;
const decoded = client.utils.decodePayload({ payload: msg.payload });

const tx = await client.ton.wallet.v4r2.send({
  destinationAddress: msg.address,
  amount: Number(init.data.amount),
  payload: decoded.ok ? decoded.data.decoded : "",
});

console.log(tx.ok ? "Sent ✅" : `Failed: ${tx.error.message}`);
```

## 🧰 Multiple accounts

Each `Fragment` instance is fully isolated — just create more:

```ts
const a = new Fragment({ hash: "..." });
const b = new Fragment({ hash: "..." });
```

## 🧪 Testing

The whole library is covered with mock tests (Vitest + `axios-mock-adapter`, with `@ton/ton` mocked):

```bash
npm test            # run the suite
npm run test:coverage
```

## 🎯 Design principles

- **Class-based** — `new Fragment({ … })`, one fully isolated client per account.
- **Object params** — `getPrice({ quantity })` reads clearly and stays easy to extend.
- **`Result` instead of exceptions** — check `res.ok` instead of `try/catch`.
- **`async` + camelCase** throughout, strict types everywhere.

## ⚠️ Disclaimer

This is an **unofficial** library, not affiliated with or endorsed by Telegram or Fragment. It works against undocumented endpoints that can change at any time. Use it responsibly, at your own risk, and in compliance with Fragment's terms of service. You are solely responsible for your credentials and funds.

## 🤝 Contributing

Issues and pull requests are welcome! [Open an issue](https://github.com/dreminDev/telegram-fragment-api/issues).

## ⭐ Support the project

If this saved you time, the best thank-you is a **[star on GitHub](https://github.com/dreminDev/telegram-fragment-api)** ⭐ — it helps others discover the library and keeps development going.

## 📄 License

[MIT](./LICENSE) © Maksim Dremin
