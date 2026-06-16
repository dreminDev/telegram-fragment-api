/**
 * Main entry point — a class-based, fully-typed client for Fragment.com.
 *
 * ```ts
 * import { Fragment } from "telegram-fragment-api";
 *
 * const client = new Fragment({
 *   hash: "...",
 *   stelSsid: "...",
 *   stelToken: "...",
 *   stelTonToken: "...",
 *   toncenterApiKey: "...",
 *   walletSeed: "word1 word2 ...",
 * });
 *
 * const res = await client.stars.getPrice({ quantity: 5050 });
 * if (res.ok) console.log(res.data.curPrice.TON);
 * else console.error(res.error.code, res.error.message);
 * ```
 */

import type {
  FragmentConfig,
  FragmentCredentials,
  ResolvedCredentials,
} from "./core/config.js";
import { FragmentContext } from "./core/context.js";
import { AccountService } from "./services/account.service.js";
import { AuthService } from "./services/auth.service.js";
import { PremiumService } from "./services/premium.service.js";
import { StarsService } from "./services/stars.service.js";
import { TonService } from "./services/ton.service.js";
import { UsersService } from "./services/users.service.js";
import { UtilsService } from "./services/utils.service.js";

export class Fragment {
  private readonly ctx: FragmentContext;

  /** Session / authentication helpers (`fetchHash`). */
  readonly auth: AuthService;
  /** Username lookups (`nickToHash`). */
  readonly users: UsersService;
  /** Stateless helpers (`decodePayload`). */
  readonly utils: UtilsService;
  /** Telegram Stars (`getPrice`, `initPayment`, `getPaymentInfo`). */
  readonly stars: StarsService;
  /** Telegram Premium (`getPrice`). */
  readonly premium: PremiumService;
  /** TON blockchain (`getRandomLiteServer`, `wallet.getBalance`, `wallet.v4r2.send`). */
  readonly ton: TonService;
  /** Authenticated account info (`getProfile`, `getSessions`). */
  readonly account: AccountService;

  constructor(config: FragmentConfig = {}) {
    this.ctx = new FragmentContext(config);
    this.auth = new AuthService(this.ctx);
    this.users = new UsersService(this.ctx);
    this.utils = new UtilsService(this.ctx);
    this.stars = new StarsService(this.ctx);
    this.premium = new PremiumService(this.ctx);
    this.ton = new TonService(this.ctx);
    this.account = new AccountService(this.ctx);
  }

  /** Update credentials at runtime (chainable). */
  configure(credentials: Partial<FragmentCredentials>): this {
    this.ctx.update(credentials);
    return this;
  }

  /** A read-only snapshot of the current credentials. */
  getCredentials(): ResolvedCredentials {
    return { ...this.ctx.credentials };
  }
}
