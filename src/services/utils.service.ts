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
}
