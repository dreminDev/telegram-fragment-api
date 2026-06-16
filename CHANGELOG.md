# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
