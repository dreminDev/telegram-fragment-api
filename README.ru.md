<div align="center">

# 🧩 telegram-fragment-api

**Неофициальный полностью типизированный TypeScript-клиент для [Fragment.com](https://fragment.com)**

Покупка Telegram Stars, цены Premium, поиск пользователей и переводы TON — на классах, безопасно через `Result`, без исключений.

[![npm version](https://img.shields.io/npm/v/telegram-fragment-api?color=cb3837&logo=npm)](https://www.npmjs.com/package/telegram-fragment-api)
[![npm downloads](https://img.shields.io/npm/dm/telegram-fragment-api?color=cb3837&logo=npm)](https://www.npmjs.com/package/telegram-fragment-api)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/dreminDev/telegram-fragment-api?style=social)](https://github.com/dreminDev/telegram-fragment-api)

[English](./README.md) · **Русский**

</div>

---

> ### ⭐ Нравится библиотека?
> **Пожалуйста, [поставьте звезду репозиторию на GitHub](https://github.com/dreminDev/telegram-fragment-api)** — это один клик, вам ничего не стоит, а проекту реально помогает развиваться и поддерживаться. Спасибо! 🙏

---

## ✨ Возможности

- 🏛️ **Классовый namespace-API** — `client.stars.getPrice({ quantity })`, `client.ton.wallet.v4r2.send({ … })`
- 🧯 **Без исключений** — каждый метод возвращает `Result` (`{ ok: true, data } | { ok: false, error }`)
- 🧩 **Типизированные ошибки** — структурный `FragmentError` с `code` (`VALIDATION`, `AUTH`, `NETWORK`, `API`, …)
- 🔭 **Поиск по нику**, ⭐ **Stars** (цены + покупка), 👑 **Premium** (цены)
- 💎 **Блокчейн TON** — lite-серверы, баланс кошелька и **переводы v4r2**
- 🔑 **Авто-hash** — парсинг hash сессии через `client.auth.fetchHash()`
- 🧾 **Декодер payload**, 👤 **профиль и сессии**
- 🟦 **100% TypeScript** + 🧪 **полностью покрыт мок-тестами** (Vitest), ESM **и** CommonJS, на **axios**

## 📦 Установка

```bash
# npm
npm install telegram-fragment-api

# yarn
yarn add telegram-fragment-api

# pnpm
pnpm add telegram-fragment-api

# bun
bun add telegram-fragment-api
```

> Работает на **Node.js ≥ 18**, **Bun** и любом рантайме с глобальным `fetch`.
> Поставляется в двух форматах — **ESM + CommonJS**, поэтому `import` и `require` оба работают.

## 🚀 Быстрый старт

```ts
import { Fragment } from "telegram-fragment-api";

// Создаём клиент со своими данными (см. «Где взять данные» ниже)
const client = new Fragment({
  hash: "ваш_hash",
  stelSsid: "ваш_stel_ssid",
  stelToken: "ваш_stel_token",
  stelTonToken: "ваш_stel_ton_token",
  toncenterApiKey: "ваш_toncenter_api_key",
  walletSeed: "слово1 слово2 ... слово24",
});

const res = await client.stars.getPrice({ quantity: 5050 });
if (res.ok) {
  console.log(res.data.curPrice); // { TON: "...", USDT: "..." }
} else {
  console.error(res.error.code, res.error.message);
}
```

> **CommonJS?** `const { Fragment } = require("telegram-fragment-api");` тоже работает — сборки ESM/CJS.

## 🧯 Обработка ошибок — паттерн `Result`

Методы не бросают исключений. Каждый возвращает размеченное объединение, которое сужается по `res.ok`:

```ts
const res = await client.users.nickToHash({ nickname: "durov" });

if (res.ok) {
  // res.data полностью типизирован здесь
  console.log(res.data.found?.recipient);
} else {
  // res.error — это FragmentError
  switch (res.error.code) {
    case "AUTH":      /* неверные cookie / hash */ break;
    case "NOT_FOUND": /* у ника нет recipient */ break;
    case "NETWORK":   /* таймаут / соединение */ break;
    default:          console.error(res.error.message);
  }
}
```

Коды ошибок: `VALIDATION` · `AUTH` · `NETWORK` · `API` · `PARSE` · `NOT_FOUND` · `INSUFFICIENT_FUNDS` · `UNKNOWN`.

## 🔑 Где взять данные

| Поле | Где взять |
|---|---|
| `hash` | Параметр `hash` в любом XHR к `fragment.com/api` — или вызовите `client.auth.fetchHash()` |
| `stelSsid`, `stelToken`, `stelTonToken` | Cookie на `fragment.com` (DevTools → Application → Cookies) |
| `stelDt` | Cookie `stel_dt` (смещение таймзоны, обычно `"-180"`) |
| `toncenterApiKey` | Бесплатный ключ от [@tonapibot](https://t.me/tonapibot) / [toncenter.com](https://toncenter.com) |
| `tonconsoleApiKey` | Альтернативный источник баланса — [tonconsole.com](https://tonconsole.com) (tonapi.io) |
| `walletSeed` | 24-словная мнемоника кошелька — **нужна только для отправки TON** |

> 🔒 **Безопасность:** относитесь к этим данным как к паролям. Храните в переменных окружения, не хардкодьте и не коммитьте. Любой, у кого есть ваш `walletSeed`, может вывести все средства.

Данные можно обновлять и после создания клиента:

```ts
client.configure({ hash: "новый_hash" });
await client.auth.fetchHash(); // спарсит и сохранит hash автоматически
```

## 📚 Справочник API

Каждый сетевой вызов возвращает `Promise<Result<T>>`.

### `client.users` / `client.utils`

```ts
await client.users.nickToHash({ nickname: "durov" });        // → recipient-хеш
client.utils.decodePayload({ payload: "te6ccg..." });        // → { decoded } (синхронно)
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
  amount: 0.21,                          // в TON
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
await client.auth.fetchHash();                       // парсит hash со страницы fragment.com/
await client.auth.fetchHash({ url: ".../stars" });   // с конкретной страницы
```

## 🔗 Полный сценарий: покупка Stars от и до

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

console.log(tx.ok ? "Отправлено ✅" : `Ошибка: ${tx.error.message}`);
```

## 🧰 Несколько аккаунтов

Каждый экземпляр `Fragment` полностью изолирован — просто создайте ещё:

```ts
const a = new Fragment({ hash: "..." });
const b = new Fragment({ hash: "..." });
```

## 🧪 Тестирование

Вся библиотека покрыта мок-тестами (Vitest + `axios-mock-adapter`, `@ton/ton` замокан):

```bash
npm test            # запустить тесты
npm run test:coverage
```

## 🎯 Принципы дизайна

- **На классах** — `new Fragment({ … })`, один изолированный клиент на аккаунт.
- **Объект-параметры** — `getPrice({ quantity })` читается ясно и легко расширяется.
- **`Result` вместо исключений** — проверяем `res.ok` вместо `try/catch`.
- Везде **`async`** и **camelCase**, строгие типы.

## ⚠️ Дисклеймер

Это **неофициальная** библиотека, не связанная с Telegram или Fragment. Она работает с недокументированными эндпоинтами, которые могут измениться в любой момент. Используйте на свой страх и риск и в соответствии с правилами Fragment. Вы несёте полную ответственность за свои данные и средства.

## 🤝 Контрибьютинг

Issues и pull requests приветствуются! [Создайте issue](https://github.com/dreminDev/telegram-fragment-api/issues).

## ⭐ Поддержать проект

Если библиотека сэкономила вам время — лучшее «спасибо» это **[звезда на GitHub](https://github.com/dreminDev/telegram-fragment-api)** ⭐. Это помогает другим находить проект и поддерживает разработку.

## 📄 Лицензия

[MIT](./LICENSE) © Maksim Dremin
