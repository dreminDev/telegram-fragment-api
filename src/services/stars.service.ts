import { BaseService } from "../core/context.js";
import { apiError, validationError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type {
  GetPaymentInfoParams,
  GetStarsPriceParams,
  InitStarsPaymentParams,
  PaymentInfo,
  PaymentInit,
  StarsPrice,
} from "../types.js";

interface RawPriceResponse {
  ok?: boolean;
  cur_price?: string;
}

/** Telegram Stars: pricing and the purchase flow. */
export class StarsService extends BaseService {
  /**
   * Get the current price for a given quantity of Telegram Stars.
   *
   * @example
   * ```ts
   * const res = await client.stars.getPrice({ quantity: 5050 });
   * if (res.ok) console.log(res.data.curPrice.TON, res.data.curPrice.USDT);
   * ```
   */
  async getPrice({
    quantity,
  }: GetStarsPriceParams): Promise<Result<StarsPrice>> {
    const qty =
      typeof quantity === "string" ? Number.parseInt(quantity, 10) : quantity;
    if (!Number.isFinite(qty) || qty <= 0) {
      return err(validationError("`quantity` must be a positive number."));
    }

    const res = await this.ctx.http.postForm<RawPriceResponse>(
      this.ctx.apiUrl(),
      { stars: 0, quantity: Math.trunc(qty), method: "updateStarsPrices" },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (!res.data.ok) {
      return err(
        apiError("Fragment returned ok=false for the price request.", {
          details: res.data,
        }),
      );
    }

    const html = res.data.cur_price ?? "";
    const tonMatch = html.match(
      /icon-ton">(\d+)<span class="mini-frac">\.(\d+)<\/span>/,
    );
    const ton = tonMatch ? `${tonMatch[1]}.${tonMatch[2]}` : "0";
    // USD is rendered as `&#036;75.75` / `&#36;75.75` / `$75.75` (entity or literal).
    const usdtMatch = html.match(/(?:&#0?36;|\$)\s*(\d+(?:\.\d+)?)/);
    const usdt = usdtMatch ? usdtMatch[1]! : "0";

    return ok({ ok: true, curPrice: { TON: ton, USDT: usdt } });
  }

  /**
   * Initialize a Stars purchase for a recipient.
   *
   * ⚠️ **No longer functional.** Fragment moved Stars checkout to TON Connect and
   * this legacy endpoint now responds with `Access denied`. Kept for
   * completeness; see the README "client.stars" note. `getPrice` is unaffected.
   *
   * @example
   * ```ts
   * const res = await client.stars.initPayment({ recipient, quantity: 50 });
   * if (res.ok) console.log(res.data.req_id, res.data.amount);
   * ```
   */
  async initPayment({
    recipient,
    quantity,
  }: InitStarsPaymentParams): Promise<Result<PaymentInit>> {
    if (typeof recipient !== "string" || recipient.length === 0) {
      return err(validationError("`recipient` must be a non-empty string."));
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return err(validationError("`quantity` must be a positive number."));
    }

    const res = await this.ctx.http.postForm<PaymentInit>(
      this.ctx.apiUrl(),
      { recipient, quantity, method: "initBuyStarsRequest" },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (!res.data.req_id) {
      return err(
        apiError("Fragment did not return a req_id.", { details: res.data }),
      );
    }
    return ok(res.data);
  }

  /**
   * Get the on-chain transaction details (address, amount, payload) for a Stars
   * purchase initialized with {@link StarsService.initPayment}.
   *
   * ⚠️ **No longer functional** — depends on {@link StarsService.initPayment},
   * which Fragment has locked behind TON Connect (`Access denied`).
   */
  async getPaymentInfo({
    requestId,
  }: GetPaymentInfoParams): Promise<Result<PaymentInfo>> {
    if (typeof requestId !== "string" || requestId.length === 0) {
      return err(validationError("`requestId` must be a non-empty string."));
    }

    const res = await this.ctx.http.postForm<PaymentInfo>(
      this.ctx.apiUrl(),
      { transaction: 1, id: requestId, method: "getBuyStarsLink" },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (!res.data.ok || !res.data.transaction) {
      return err(
        apiError(res.data.error ?? "Fragment returned no transaction.", {
          details: res.data,
        }),
      );
    }
    return ok(res.data);
  }
}
