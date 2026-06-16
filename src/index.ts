/**
 * telegram-fragment-api — unofficial, fully-typed TypeScript client for
 * Fragment.com (Telegram Stars, Premium, usernames and TON).
 */

export { Fragment } from "./Fragment.js";
export { Fragment as default } from "./Fragment.js";

// Services (exported so consumers can type/extend them)
export { AccountService, parseProfile, parseSessions } from "./services/account.service.js";
export { AuthService } from "./services/auth.service.js";
export { PremiumService, parsePremium } from "./services/premium.service.js";
export { StarsService } from "./services/stars.service.js";
export { TonService, intToIp } from "./services/ton.service.js";
export { UsersService } from "./services/users.service.js";
export { UtilsService } from "./services/utils.service.js";
export { V4R2Service, WalletService } from "./services/wallet.service.js";

// Core: config, errors, result
export type {
  FragmentConfig,
  FragmentCredentials,
  ResolvedCredentials,
} from "./core/config.js";
export {
  FragmentError,
  type FragmentErrorCode,
  type FragmentErrorOptions,
} from "./core/errors.js";
export {
  isErr,
  isOk,
  ok,
  err,
  type Err,
  type Ok,
  type Result,
} from "./core/result.js";

// Pure helpers
export { decodePayload } from "./parsers/decoder.js";
/** Re-exported TON unit helpers — exact, no floating point. */
export { fromNano, toNano } from "@ton/ton";

// Domain + parameter types
export type * from "./types.js";
