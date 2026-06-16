import { BaseService } from "../core/context.js";
import { parseError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type { FetchHashData, FetchHashParams } from "../types.js";

const HASH_PATTERNS: RegExp[] = [
  /api\?hash=([0-9a-f]{16,})/i,
  /"apiUrl":"\\?\/api\?hash=([0-9a-f]{16,})/i,
  /hash=([0-9a-f]{16,})/i,
];

/** Session / authentication helpers. */
export class AuthService extends BaseService {
  /**
   * Scrape the per-session api `hash` from a Fragment page and store it in the
   * client config, so you don't have to copy it by hand.
   *
   * Requires the `stel_*` cookies to already be configured. The extracted hash
   * is saved into the client (subsequent calls use it automatically).
   *
   * @example
   * ```ts
   * const res = await client.auth.fetchHash();
   * if (res.ok) console.log("hash:", res.data.hash);
   * ```
   */
  async fetchHash({
    url = "https://fragment.com/",
  }: FetchHashParams = {}): Promise<Result<FetchHashData>> {
    const res = await this.ctx.http.getText(url, {
      headers: this.ctx.htmlHeaders(),
    });
    if (!res.ok) return res;

    for (const pattern of HASH_PATTERNS) {
      const match = res.data.match(pattern);
      if (match?.[1]) {
        const hash = match[1];
        this.ctx.update({ hash });
        return ok({ hash });
      }
    }

    return err(
      parseError(
        "Could not extract the api hash from the page. Are your stel_* cookies valid?",
      ),
    );
  }
}
