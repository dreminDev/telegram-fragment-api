import {
  Cell,
  beginCell,
  external,
  storeMessage,
  storeStateInit,
} from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV4, fromNano, internal, toNano } from "@ton/ton";
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
  TonConnectAccount,
  WalletAddress,
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
   * Pass the amount **either** as `amount` (human TON, e.g. `0.21`) **or**
   * `amountNano` (exact nanoTON, e.g. Fragment's `msg.amount`). Prefer
   * `amountNano` when forwarding a Fragment payment — it's exact and avoids the
   * float-division footgun.
   *
   * @example
   * ```ts
   * // human amount
   * await client.ton.wallet.v4r2.send({ destinationAddress: "UQ...", amount: 0.21 });
   *
   * // exact Fragment payment — pass amount + payload straight from getPaymentInfo
   * await client.ton.wallet.v4r2.send({
   *   destinationAddress: msg.address,
   *   amountNano: msg.amount,            // "456100000"
   *   payloadCell: msg.payload,          // exact BoC cell, byte-matches the site
   * });
   * ```
   */
  async send({
    destinationAddress,
    amount,
    amountNano,
    payload = "",
    payloadCell,
  }: SendTonParams): Promise<Result<SendTonData>> {
    const { toncenterApiKey, walletSeed } = this.ctx.credentials;

    if (typeof destinationAddress !== "string" || destinationAddress.length === 0) {
      return err(validationError("`destinationAddress` must be a non-empty string."));
    }

    // Resolve the value to send as exact nanoTON (bigint) — no floats.
    const valueResult = resolveValueNano(amount, amountNano);
    if (!valueResult.ok) return valueResult;
    const valueNano = valueResult.data;

    // Body: an exact base64 BoC cell (preferred for Fragment payments — it is
    // byte-identical to what the website sends) or a plain text comment.
    let body: Cell | string = payload;
    if (payloadCell !== undefined) {
      try {
        body = Cell.fromBase64(payloadCell);
      } catch {
        return err(validationError("`payloadCell` is not a valid base64 BoC cell."));
      }
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

      if (balanceNano < valueNano) {
        return err(
          insufficientFundsError(
            `Insufficient funds. Required ${fromNano(valueNano)} TON, available ${fromNano(balanceNano)} TON.`,
            {
              details: {
                requiredNano: valueNano.toString(),
                availableNano: balanceNano.toString(),
              },
            },
          ),
        );
      }

      const seqno = await contract.getSeqno();
      // Sign the transfer body locally — we need the resulting cell separately
      // so we can serialize the outer external message and capture its base64
      // BoC. Fragment's `confirm_method` POST needs that BoC verbatim (see
      // `StarsService.confirmPayment`); without it, the TON tx broadcasts but
      // Fragment never credits the Stars.
      const transferBody = wallet.createTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [
          internal({
            to: destinationAddress,
            value: valueNano,
            body,
            bounce: false,
          }),
        ],
      });

      const externalCell = beginCell()
        .store(
          storeMessage(
            external({ to: wallet.address, body: transferBody }),
          ),
        )
        .endCell();
      const boc = externalCell.toBoc().toString("base64");

      await client.sendFile(externalCell.toBoc());

      return ok({
        destination: destinationAddress,
        amount: Number(fromNano(valueNano)),
        amountNano: valueNano.toString(),
        payload: payloadCell ?? payload,
        sender,
        boc,
        balanceBefore: {
          nano: Number(balanceNano),
          ton: Number(fromNano(balanceNano)),
        },
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

/** Resolve `amount` (TON) / `amountNano` (nanoTON) into an exact bigint nano value. */
function resolveValueNano(
  amount: number | undefined,
  amountNano: string | bigint | undefined,
): Result<bigint> {
  if (amount !== undefined && amountNano !== undefined) {
    return err(
      validationError("Provide either `amount` or `amountNano`, not both."),
    );
  }
  if (amountNano !== undefined) {
    let v: bigint;
    try {
      v = BigInt(amountNano);
    } catch {
      return err(validationError("`amountNano` must be an integer (nanoTON)."));
    }
    if (v <= 0n) {
      return err(validationError("`amountNano` must be greater than 0."));
    }
    return ok(v);
  }
  if (amount !== undefined) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return err(validationError("`amount` must be greater than 0."));
    }
    return ok(toNano(amount.toString()));
  }
  return err(validationError("Provide `amount` (TON) or `amountNano` (nanoTON)."));
}

/** TON wallet operations: balance + nested v4r2 transfers. */
export class WalletService extends BaseService {
  readonly v4r2: V4R2Service;

  constructor(ctx: FragmentContext) {
    super(ctx);
    this.v4r2 = new V4R2Service(ctx);
  }

  /**
   * Derive your wallet's v4r2 address from the configured `walletSeed` — no
   * network. Compare `raw` with a Fragment `transaction.from` to confirm the
   * payment will originate from the wallet the order expects.
   *
   * @example
   * ```ts
   * const me = await client.ton.wallet.getAddress();
   * if (me.ok) console.log(me.data.friendly, me.data.raw);
   * ```
   */
  async getAddress(): Promise<Result<WalletAddress>> {
    const { walletSeed } = this.ctx.credentials;
    if (!walletSeed) return err(validationError("walletSeed is not set."));
    try {
      const keyPair = await mnemonicToPrivateKey(walletSeed.trim().split(/\s+/));
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      return ok({
        friendly: wallet.address.toString(),
        raw: wallet.address.toRawString(),
      });
    } catch (e) {
      return err(
        new FragmentError("VALIDATION", "Invalid walletSeed.", { cause: e }),
      );
    }
  }

  /**
   * Build the TON Connect-style account JSON Fragment expects in the
   * post-broadcast confirm call (see {@link StarsService.confirmPayment}).
   *
   * The shape matches what `tonConnectUI.wallet.account` carries on
   * fragment.com — raw address, hex public key, mainnet chain, and the BoC of
   * the wallet's StateInit.
   *
   * @example
   * ```ts
   * const account = await client.ton.wallet.getAccount();
   * if (account.ok) console.log(account.data.address);
   * ```
   */
  async getAccount(): Promise<Result<TonConnectAccount>> {
    const { walletSeed } = this.ctx.credentials;
    if (!walletSeed) return err(validationError("walletSeed is not set."));
    try {
      const keyPair = await mnemonicToPrivateKey(walletSeed.trim().split(/\s+/));
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const stateInitCell = beginCell()
        .store(
          storeStateInit({
            code: wallet.init.code,
            data: wallet.init.data,
          }),
        )
        .endCell();
      return ok({
        address: wallet.address.toRawString(),
        publicKey: keyPair.publicKey.toString("hex"),
        chain: "-239",
        walletStateInit: stateInitCell.toBoc().toString("base64"),
      });
    } catch (e) {
      return err(
        new FragmentError("VALIDATION", "Invalid walletSeed.", { cause: e }),
      );
    }
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
