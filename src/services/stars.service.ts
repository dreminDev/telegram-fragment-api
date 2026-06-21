import { BaseService, type FragmentContext } from "../core/context.js";
import { FragmentError, apiError, validationError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type {
  ConfirmStarsPaymentData,
  ConfirmStarsPaymentParams,
  GetPaymentInfoParams,
  GetStarsPriceParams,
  InitStarsPaymentParams,
  PaymentInfo,
  PaymentInit,
  PurchaseStarsData,
  PurchaseStarsParams,
  StarsPrice,
  TonConnectDevice,
} from "../types.js";
import { WalletService } from "./wallet.service.js";

interface RawPriceResponse {
  ok?: boolean;
  cur_price?: string;
}

/**
 * Default TonConnect device hint sent with the confirm call. Fragment doesn't
 * verify the contents, but the field must be present and well-formed JSON.
 */
const DEFAULT_DEVICE: TonConnectDevice = {
  platform: "windows",
  appName: "tonkeeper",
  appVersion: "4.10.0",
  maxProtocolVersion: 2,
  features: [
    "SendTransaction",
    { name: "SendTransaction", maxMessages: 4 },
    { name: "SignData", types: ["text", "binary", "cell"] },
  ],
};

/** Telegram Stars: pricing and the purchase flow. */
export class StarsService extends BaseService {
  private readonly wallet: WalletService;

  constructor(ctx: FragmentContext, wallet: WalletService) {
    super(ctx);
    this.wallet = wallet;
  }
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

    // Fragment rejects a "cold" init with "Price was changed" unless the
    // session's TON price was just synced. The website does this by polling
    // updateStarsBuyState; we sync once before each attempt and retry if the
    // (volatile) TON price moves in between.
    let last: PaymentInit | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.syncBuyState();

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
      last = res.data;

      if (res.data.req_id) return ok(res.data);
      if (res.data.need_ton) {
        return err(
          new FragmentError(
            "AUTH",
            "Fragment requires a connected TON wallet (need_ton). Connect a wallet on fragment.com first.",
            { details: res.data },
          ),
        );
      }
      // Price drifted between sync and init — re-sync and try again.
      if (res.data.error && /price/i.test(res.data.error)) continue;
      if (res.data.error) {
        return err(apiError(res.data.error, { details: res.data }));
      }
      return err(
        apiError("Fragment did not return a req_id.", { details: res.data }),
      );
    }
    return err(
      apiError("Could not lock a price (it kept changing). Try again.", {
        details: last,
      }),
    );
  }

  /** Sync the session's Stars buy state (TON price) like the website's poller. */
  private async syncBuyState(): Promise<void> {
    await this.ctx.http.postForm(
      this.ctx.apiUrl(),
      { mode: "new", lv: "false", method: "updateStarsBuyState" },
      { headers: this.ctx.apiHeaders() },
    );
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

  /**
   * Tell Fragment that a Stars TON payment has been broadcast.
   *
   * The website does this automatically after TonConnect signs the transfer
   * (see `Wallet.sendTransaction` in `auction.js`). It POSTs the `confirm_method`
   * returned by {@link getPaymentInfo} with `{account, device, boc, ...confirm_params}`.
   * **Without this call Fragment never matches the on-chain TON to the order**,
   * so Stars are not credited — even though the TON debits successfully.
   *
   * @example
   * ```ts
   * const tx = await client.ton.wallet.v4r2.send({ ... });
   * const account = await client.ton.wallet.getAccount();
   * if (tx.ok && account.ok) {
   *   await client.stars.confirmPayment({
   *     method: info.data.confirm_method!,
   *     params: info.data.confirm_params,
   *     account: account.data,
   *     boc: tx.data.boc,
   *   });
   * }
   * ```
   */
  async confirmPayment({
    method,
    params = {},
    account,
    device = DEFAULT_DEVICE,
    boc,
  }: ConfirmStarsPaymentParams): Promise<Result<ConfirmStarsPaymentData>> {
    if (typeof method !== "string" || method.length === 0) {
      return err(validationError("`method` must be a non-empty string."));
    }
    if (typeof boc !== "string" || boc.length === 0) {
      return err(validationError("`boc` must be a non-empty string."));
    }
    if (!account || typeof account.address !== "string") {
      return err(validationError("`account` is required."));
    }

    const body: Record<string, string | number> = {
      account: JSON.stringify(account),
      device: JSON.stringify(device),
      boc,
    };
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      body[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    body.method = method;

    const res = await this.ctx.http.postForm<ConfirmStarsPaymentData>(
      this.ctx.apiUrl(),
      body,
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (res.data && res.data.ok === false) {
      const raw = res.data as unknown as { error?: unknown };
      const errMsg =
        typeof raw.error === "string"
          ? raw.error
          : "Fragment did not credit the Stars purchase.";
      return err(apiError(errMsg, { details: res.data }));
    }
    return ok(res.data ?? { ok: true });
  }

  /**
   * High-level Stars purchase — runs the full Fragment flow end-to-end:
   * `initBuyStarsRequest` → `getBuyStarsLink` → broadcast TON → `confirm_method`.
   *
   * Requires `walletSeed` and `toncenterApiKey` in addition to the usual
   * `stel_*` cookies + `hash`.
   *
   * @example
   * ```ts
   * const user = await client.users.nickToHash({ nickname: "maksim_dremin" });
   * if (!user.ok) return;
   * const res = await client.stars.purchase({
   *   recipient: user.data.found!.recipient,
   *   quantity: 50,
   * });
   * if (res.ok) console.log("Stars sent:", res.data.amount, "TON, req", res.data.reqId);
   * ```
   */
  async purchase({
    recipient,
    quantity,
    showSender = false,
    device,
  }: PurchaseStarsParams): Promise<Result<PurchaseStarsData>> {
    const init = await this.initPayment({ recipient, quantity });
    if (!init.ok) return init;

    const info = await this.getPaymentInfo({
      requestId: init.data.req_id,
      showSender,
    });
    if (!info.ok) return info;

    const message = info.data.transaction?.messages[0];
    if (!message) {
      return err(
        apiError("Fragment returned no transaction message.", {
          details: info.data,
        }),
      );
    }

    const account = await this.wallet.getAccount();
    if (!account.ok) return account;

    const tx = await this.wallet.v4r2.send({
      destinationAddress: message.address,
      amountNano: message.amount,
      payloadCell: message.payload,
    });
    if (!tx.ok) return tx;

    if (!info.data.confirm_method) {
      return err(
        apiError(
          "Fragment did not return a `confirm_method` — cannot credit Stars without it.",
          { details: info.data },
        ),
      );
    }

    const confirm = await this.confirmPayment({
      method: info.data.confirm_method,
      params: info.data.confirm_params,
      account: account.data,
      device,
      boc: tx.data.boc,
    });
    if (!confirm.ok) return confirm;

    return ok({
      reqId: init.data.req_id,
      amount: tx.data.amount,
      amountNano: tx.data.amountNano,
      destination: tx.data.destination,
      sender: tx.data.sender,
      boc: tx.data.boc,
      confirm: confirm.data,
    });
  }
}
