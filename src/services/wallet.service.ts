import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV4, internal, toNano } from "@ton/ton";
import { BaseService, type FragmentContext } from "../core/context.js";
import {
  FragmentError,
  insufficientFundsError,
  validationError,
} from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type {
  GetBalanceParams,
  SendTonData,
  SendTonParams,
  WalletBalance,
} from "../types.js";

const NANO = 1_000_000_000;
const TONCENTER_RPC = "https://toncenter.com/api/v2/jsonRPC";

/** v4r2 wallet transfers. */
export class V4R2Service extends BaseService {
  /**
   * Send TON from your v4r2 wallet, attaching an optional text comment.
   *
   * Requires `toncenterApiKey` and `walletSeed`. Performs a balance check
   * before broadcasting.
   *
   * @example
   * ```ts
   * const res = await client.ton.wallet.v4r2.send({
   *   destinationAddress: "UQ...",
   *   amount: 0.21,
   *   payload: "50 Telegram Stars",
   * });
   * if (res.ok) console.log(res.data.sender);
   * ```
   */
  async send({
    destinationAddress,
    amount,
    payload = "",
  }: SendTonParams): Promise<Result<SendTonData>> {
    const { toncenterApiKey, walletSeed } = this.ctx.credentials;

    if (typeof destinationAddress !== "string" || destinationAddress.length === 0) {
      return err(validationError("`destinationAddress` must be a non-empty string."));
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return err(validationError("`amount` must be greater than 0."));
    }
    if (!toncenterApiKey) {
      return err(validationError("toncenterApiKey is not set."));
    }
    if (!walletSeed) {
      return err(validationError("walletSeed is not set."));
    }

    try {
      const client = new TonClient({
        endpoint: TONCENTER_RPC,
        apiKey: toncenterApiKey,
      });

      const mnemonics = walletSeed.trim().split(/\s+/);
      const keyPair = await mnemonicToPrivateKey(mnemonics);
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const contract = client.open(wallet);
      const sender = wallet.address.toString();

      const balanceNano = await contract.getBalance();
      const balanceTon = Number(balanceNano) / NANO;

      if (balanceTon < amount) {
        return err(
          insufficientFundsError(
            `Insufficient funds. Required ${amount} TON, available ${balanceTon.toFixed(4)} TON.`,
            { details: { nano: Number(balanceNano), ton: balanceTon } },
          ),
        );
      }

      const seqno = await contract.getSeqno();
      await contract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
          internal({
            to: destinationAddress,
            value: toNano(amount.toString()),
            body: payload,
            bounce: false,
          }),
        ],
      });

      return ok({
        destination: destinationAddress,
        amount,
        payload,
        sender,
        balanceBefore: { nano: Number(balanceNano), ton: balanceTon },
      });
    } catch (e) {
      return err(
        new FragmentError("UNKNOWN", e instanceof Error ? e.message : "Failed to send TON.", {
          cause: e,
        }),
      );
    }
  }
}

/** TON wallet operations: balance + nested v4r2 transfers. */
export class WalletService extends BaseService {
  readonly v4r2: V4R2Service;

  constructor(ctx: FragmentContext) {
    super(ctx);
    this.v4r2 = new V4R2Service(ctx);
  }

  /**
   * Check a TON wallet balance. Uses toncenter when `toncenterApiKey` is set,
   * otherwise tonconsole (tonapi.io) when `tonconsoleApiKey` is set.
   *
   * @example
   * ```ts
   * const res = await client.ton.wallet.getBalance({ address: "UQ..." });
   * if (res.ok) console.log(res.data.ton);
   * ```
   */
  async getBalance({
    address,
  }: GetBalanceParams): Promise<Result<WalletBalance>> {
    if (typeof address !== "string" || address.length === 0) {
      return err(validationError("`address` must be a non-empty string."));
    }

    const { toncenterApiKey, tonconsoleApiKey } = this.ctx.credentials;
    if (toncenterApiKey) return this.balanceFromToncenter(address);
    if (tonconsoleApiKey) return this.balanceFromTonconsole(address);
    return err(
      validationError(
        "No API key set. Provide toncenterApiKey or tonconsoleApiKey.",
      ),
    );
  }

  private async balanceFromToncenter(
    address: string,
  ): Promise<Result<WalletBalance>> {
    const res = await this.ctx.http.getJson<{
      ok?: boolean;
      result?: string;
      error?: string;
    }>("https://toncenter.com/api/v2/getAddressBalance", {
      params: { address },
      headers: { "X-API-Key": this.ctx.credentials.toncenterApiKey },
    });
    if (!res.ok) return res;

    if (res.data.ok && res.data.result !== undefined) {
      const nano = Number.parseInt(res.data.result, 10);
      return ok({ nano, ton: nano / NANO, source: "toncenter" });
    }
    return err(toApiError(res.data.error ?? "Unknown toncenter error", res.data));
  }

  private async balanceFromTonconsole(
    address: string,
  ): Promise<Result<WalletBalance>> {
    const res = await this.ctx.http.getJson<{ balance?: number | string }>(
      `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}`,
      { headers: { Authorization: `Bearer ${this.ctx.credentials.tonconsoleApiKey}` } },
    );
    if (!res.ok) return res;

    if (res.data.balance !== undefined) {
      const nano =
        typeof res.data.balance === "string"
          ? Number.parseInt(res.data.balance, 10)
          : res.data.balance;
      return ok({ nano, ton: nano / NANO, source: "tonconsole" });
    }
    return err(toApiError("Balance not found in tonconsole response", res.data));
  }
}

function toApiError(message: string, details: unknown): FragmentError {
  return new FragmentError("API", message, { details });
}
