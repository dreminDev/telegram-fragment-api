# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
