import { fromNano, toNano } from "@ton/ton";
import { BaseService } from "../core/context.js";
import { validationError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import { decodePayload } from "../parsers/decoder.js";
import type { DecodePayloadData, DecodePayloadParams } from "../types.js";

/** Stateless helpers (no network). */
export class UtilsService extends BaseService {
  /**
   * Decode a base64 transaction payload into its readable comment text.
   *
   * @example
   * ```ts
   * const res = client.utils.decodePayload({ payload: "te6ccg..." });
   * if (res.ok) console.log(res.data.decoded);
   * ```
   */
  decodePayload({
    payload,
  }: DecodePayloadParams): Result<DecodePayloadData> {
    if (typeof payload !== "string" || payload.length === 0) {
      return err(validationError("`payload` must be a non-empty string."));
    }
    return ok({ payload, decoded: decodePayload(payload) });
  }

  /**
   * Convert human TON to exact nanoTON (1 TON = 1e9 nanoTON), with no floating
   * point. `toTon("0.4561")` → `456100000n`.
   */
  toNano(ton: string | number): bigint {
    return toNano(typeof ton === "number" ? ton.toFixed(9) : ton);
  }

  /**
   * Convert nanoTON to a human TON decimal string. `fromNano("456100000")` →
   * `"0.4561"`. Safe alternative to `Number(nano) / 1e9`.
   */
  fromNano(nano: string | bigint): string {
    return fromNano(nano);
  }
}
