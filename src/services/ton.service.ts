import { BaseService, type FragmentContext } from "../core/context.js";
import { notFoundError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type { LiteServer, TonGlobalConfig } from "../types.js";
import { WalletService } from "./wallet.service.js";

const CONFIG_URL = "https://ton-blockchain.github.io/global.config.json";

/** Convert a (possibly signed) int32 IP to a dotted-decimal string. */
export function intToIp(ipInt: number): string {
  const v = ipInt < 0 ? ipInt + 2 ** 32 : ipInt;
  return [
    (v >>> 24) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 8) & 0xff,
    v & 0xff,
  ].join(".");
}

/** TON blockchain: liteservers and wallet operations. */
export class TonService extends BaseService {
  readonly wallet: WalletService;

  constructor(ctx: FragmentContext) {
    super(ctx);
    this.wallet = new WalletService(ctx);
  }

  /** Fetch the full TON global config (contains the liteserver list). */
  async getLiteServers(): Promise<Result<TonGlobalConfig>> {
    return this.ctx.http.getJson<TonGlobalConfig>(CONFIG_URL);
  }

  /**
   * Pick a random liteserver, with the integer IP resolved to a readable
   * `ip_readable` field.
   *
   * @example
   * ```ts
   * const res = await client.ton.getRandomLiteServer();
   * if (res.ok) console.log(res.data.ip_readable, res.data.port);
   * ```
   */
  async getRandomLiteServer(): Promise<Result<LiteServer>> {
    const res = await this.getLiteServers();
    if (!res.ok) return res;

    const servers = res.data.liteservers ?? [];
    if (servers.length === 0) {
      return err(notFoundError("No liteservers found in the TON config."));
    }

    const server = servers[Math.floor(Math.random() * servers.length)]!;
    if (typeof server.ip === "number") {
      return ok({ ...server, ip_readable: intToIp(server.ip) });
    }
    return ok(server);
  }
}
