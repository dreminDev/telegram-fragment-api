import { BaseService } from "../core/context.js";
import { notFoundError, validationError } from "../core/errors.js";
import { err, ok, type Result } from "../core/result.js";
import type { NickToHashData, NickToHashParams } from "../types.js";

/** Username lookups against the Fragment API. */
export class UsersService extends BaseService {
  /**
   * Resolve a Telegram nickname to its Fragment `recipient` hash.
   *
   * @example
   * ```ts
   * const res = await client.users.nickToHash({ nickname: "durov" });
   * if (res.ok) console.log(res.data.found?.recipient);
   * ```
   */
  async nickToHash({
    nickname,
  }: NickToHashParams): Promise<Result<NickToHashData>> {
    if (typeof nickname !== "string" || nickname.trim().length === 0) {
      return err(validationError("`nickname` must be a non-empty string."));
    }

    const res = await this.ctx.http.postForm<NickToHashData>(
      this.ctx.apiUrl(),
      { query: nickname, quantity: "", method: "searchStarsRecipient" },
      { headers: this.ctx.apiHeaders() },
    );
    if (!res.ok) return res;

    if (!res.data.ok || !res.data.found) {
      return err(
        notFoundError(
          res.data.error ?? `No recipient found for "@${nickname}".`,
          { details: res.data },
        ),
      );
    }
    return ok(res.data);
  }
}
