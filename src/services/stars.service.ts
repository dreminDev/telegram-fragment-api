import { BaseService } from "../core/context.js";
import { FragmentError, apiError, validationError } from "../core/errors.js";
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
   * Sends `payment_method` (default `"ton"`) — this is **required** by Fragment;
   * omitting it yields `Access denied`. If the Fragment account has no connected
   * wallet, the response carries `need_ton`, surfaced here as an `AUTH` error.
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
    paymentMethod = "ton",
  }: InitStarsPaymentParams): Promise<Result<PaymentInit>> {
    if (typeof recipient !== "string" || recipient.length === 0) {
      return err(validationError("`recipient` must be a non-empty string."));
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return err(validationError("`quantity` must be a positive number."));
    }

    const res = await this.ctx.http.postForm<PaymentInit>(
      this.ctx.apiUrl(),
      {
        recipient,
        quantity,
        payment_method: paymentMethod,
        method: "initBuyStarsRequest",
      },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (res.data.need_ton) {
      return err(
        new FragmentError(
          "AUTH",
          "Fragment requires a connected TON wallet (need_ton). Connect a wallet on fragment.com first.",
          { details: res.data },
        ),
      );
    }
    if (res.data.error) {
      return err(apiError(res.data.error, { details: res.data }));
    }
    if (!res.data.req_id) {
      return err(
        apiError("Fragment did not return a req_id.", { details: res.data }),
      );
    }
    return ok(res.data);
  }

  /**
   * Get the on-chain transaction (address, amount, payload) for a Stars purchase
   * initialized with {@link StarsService.initPayment}. The returned
   * `transaction.messages[0]` can be signed and broadcast with
   * {@link V4R2Service.send}.
   *
   * @example
   * ```ts
   * const info = await client.stars.getPaymentInfo({ requestId });
   * if (info.ok) {
   *   const msg = info.data.transaction!.messages[0]!;
   *   // msg.address, msg.amount, msg.payload
   * }
   * ```
   */
  async getPaymentInfo({
    requestId,
    showSender = false,
  }: GetPaymentInfoParams): Promise<Result<PaymentInfo>> {
    if (typeof requestId !== "string" || requestId.length === 0) {
      return err(validationError("`requestId` must be a non-empty string."));
    }

    const res = await this.ctx.http.postForm<PaymentInfo>(
      this.ctx.apiUrl(),
      {
        id: requestId,
        show_sender: showSender ? 1 : 0,
        transaction: 1,
        method: "getBuyStarsLink",
      },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (res.data.need_verify) {
      return err(
        new FragmentError(
          "AUTH",
          "Fragment requires additional verification (need_verify) for this purchase.",
          { details: res.data },
        ),
      );
    }
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
