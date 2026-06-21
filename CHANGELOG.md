# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-06-21

### Fixed

- **Stars are finally credited after broadcast.** Reverse-engineering current
  `auction.js?107` revealed a third step the previous implementations skipped:
  after TonConnect signs and broadcasts the TON transfer, the website POSTs the
  `confirm_method` returned by `getBuyStarsLink` with `{account, device, boc,
  ...confirm_params}`. Without that call Fragment **never matches the on-chain
  payment to the `req_id`**, so TON debits but Stars never arrive. The new
  `stars.confirmPayment(...)` performs that final POST; `stars.purchase(...)`
  runs the whole flow end-to-end.

### Added

- `client.stars.purchase({ recipient, quantity, showSender? })` — high-level
  Stars purchase. Internally: `initBuyStarsRequest` → `getBuyStarsLink` →
  `wallet.v4r2.send` → `confirm_method`.
- `client.stars.confirmPayment({ method, params, account, boc, device? })` —
  low-level confirm POST when you orchestrate the steps yourself.
- `client.ton.wallet.getAccount()` — TON Connect-style account JSON
  (`{address, publicKey, chain, walletStateInit}`) Fragment expects in the
  confirm call.
- `ton.wallet.v4r2.send` now returns `boc` — the base64 BoC of the broadcast
  external message. Pass it verbatim to `confirmPayment`.
- `PaymentInfo` carries `confirm_method` and `confirm_params` straight from
  Fragment.

## [0.2.3] - 2026-06-16

### Added

- `client.ton.wallet.getAddress()` — derive your v4r2 wallet address (friendly +
  raw) from `walletSeed`, no network. Compare `raw` with a Fragment
  `transaction.from` to confirm the payment originates from the expected wallet,
  without pulling `@ton/*` into your own project.

## [0.2.2] - 2026-06-16

### Fixed

- **Stars now actually get credited.** `ton.wallet.v4r2.send` gained a
  `payloadCell` option that sends Fragment's **exact** base64 BoC cell
  (`getPaymentInfo`'s `msg.payload`) as the message body — byte-identical to
  what the website sends via TON Connect. The previous approach re-encoded the
  decoded text comment, which could differ from the original cell; Fragment then
  failed to match the `Ref#…` and the TON was spent without crediting Stars.
  Always use `payloadCell: msg.payload` for Stars purchases.

## [0.2.1] - 2026-06-16

### Fixed

- **Stars purchase now completes end-to-end.** `initPayment` first syncs the
  session's (volatile) TON price via `updateStarsBuyState` — exactly like the
  website's poller — before calling `initBuyStarsRequest`. Without this Fragment
  rejected the cold request with `Price was changed. Please try again.`. The
  call also auto-retries (up to 3×) if the TON price drifts mid-request.

### Added

- `ton.wallet.v4r2.send` now accepts **`amountNano`** (exact nanoTON, e.g.
  Fragment's `msg.amount`) as a safe alternative to `amount` (human TON). No
  `/1e9`, no floating-point rounding. The result includes both `amount` and
  `amountNano`. Validation rejects passing both or neither.
- `client.utils.toNano` / `client.utils.fromNano` (and top-level `toNano` /
  `fromNano` exports) for exact TON ⇄ nanoTON conversion.
- `StarsPaymentMethod` type for `initPayment`'s `paymentMethod`.

## [0.2.0] - 2026-06-16

### Fixed

- **Buying Stars works again.** `initPayment` now sends the `payment_method`
  parameter (default `"ton"`) that Fragment requires — omitting it caused
  `Access denied`. Discovered by reverse-engineering Fragment's own client JS.

### Added

- `initPayment` accepts `paymentMethod` (`"ton"` | `"usdt_ton"` | `"usdt_eth"` |
  `"usdt_pol"` | `"usdc_eth"` | `"usdc_base"` | `"usdc_pol"`).
- `getPaymentInfo` accepts `showSender` and now sends `show_sender` +
  `transaction` like the website does.
- `need_ton` (no connected wallet) and `need_verify` responses are surfaced as
  structured `AUTH` errors instead of a generic failure.

## [0.1.3] - 2026-06-16

### Changed

- Documented that buying Stars is no longer possible programmatically: Fragment
  moved Stars checkout to TON Connect (client-side transaction signed in the
  wallet), and the legacy `initPayment` / `getPaymentInfo` endpoints now return
  `Access denied`. The on-chain payment carries a server-issued `Ref#…` bound to
  the recipient that Fragment no longer exposes via API. Pricing and every other
  method are unaffected. Added notes to the README and method JSDoc.

## [0.1.2] - 2026-06-16

### Fixed

- Authenticated requests now work under **Bun** (and any runtime exposing a
  global `XMLHttpRequest`). axios was picking the `xhr` adapter, which strips
  the `Cookie` header — so cookie-authorized actions like buying stars failed
  with `Access denied` while public reads still worked. The HTTP client now
  forces the `http` adapter (falling back to `fetch`).

## [0.1.1] - 2026-06-16

### Fixed

- `stars.getPrice` now correctly parses the USD price. Fragment renders it as
  `&#036;75.75` (also handles `&#36;` / literal `$`) without the old `~&nbsp;`
  prefix, so the previous regex returned `"0"`.

## [0.1.0] - 2026-06-16

Initial release — a class-based, `Result`-safe TypeScript client for Fragment.com.

### Added

- `Fragment` client class with constructor config and namespaced services.
- `client.users.nickToHash` — resolve usernames.
- `client.utils.decodePayload` — decode base64 transaction payloads.
- `client.stars.getPrice` / `initPayment` / `getPaymentInfo` — Telegram Stars flow.
- `client.premium.getPrice` — Telegram Premium pricing.
- `client.ton.getLiteServers` / `getRandomLiteServer` — TON liteservers.
- `client.ton.wallet.getBalance` — wallet balance via toncenter / tonconsole.
- `client.ton.wallet.v4r2.send` — TON transfers via `@ton/ton`.
- `client.account.getProfile` / `getSessions` — account info.
- `client.auth.fetchHash` — scrape the per-session api hash.
- `Result<T>` discriminated union + structured `FragmentError` (no exceptions).
- axios transport with typed error mapping.
- Full mock test suite (Vitest + axios-mock-adapter), ~96% coverage.
- Dual ESM + CommonJS builds with full TypeScript declarations.
