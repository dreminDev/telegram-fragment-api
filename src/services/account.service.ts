import * as cheerio from "cheerio";
import { BaseService } from "../core/context.js";
import { ok, type Result } from "../core/result.js";
import type { Session, SessionList, UserProfile } from "../types.js";

/** Authenticated account info: profile and active sessions. */
export class AccountService extends BaseService {
  /**
   * Get the authenticated account's Fragment profile.
   *
   * @example
   * ```ts
   * const res = await client.account.getProfile();
   * if (res.ok) console.log(res.data.username, res.data.wallet);
   * ```
   */
  async getProfile(): Promise<Result<UserProfile>> {
    const res = await this.ctx.http.getJson<{ h?: string }>(
      "https://fragment.com/my/profile",
      {
        headers: {
          ...this.ctx.htmlHeaders(),
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://fragment.com/convert",
        },
      },
    );
    if (!res.ok) return res;

    return ok(parseProfile(res.data.h ?? ""));
  }

  /**
   * Get the list of active sessions plus basic account info.
   *
   * @example
   * ```ts
   * const res = await client.account.getSessions();
   * if (res.ok) console.log(res.data.account.username, res.data.sessions.length);
   * ```
   */
  async getSessions(): Promise<Result<SessionList>> {
    const res = await this.ctx.http.getText("https://fragment.com/my/sessions", {
      headers: this.ctx.htmlHeaders(),
    });
    if (!res.ok) return res;

    return ok(parseSessions(res.data));
  }
}

/** Exported for unit testing. */
export function parseProfile(html: string): UserProfile {
  const $ = cheerio.load(html);
  const info: UserProfile = {};

  const block = $(".tm-settings-item.tm-settings-head-item").first();
  if (block.length) {
    info.name = block.find(".tm-settings-item-head").text().trim();
    info.username = block.find(".tm-settings-item-desc").text().trim();
    const img = block.find("img").first();
    info.avatar = img.length ? (img.attr("src") ?? null) : null;
    info.verified = block.find(".tm-badge-verified").length > 0;
  }

  const wallet = $(".tm-settings-item.icon-before.icon-menu-wallet").first();
  if (wallet.length) {
    info.wallet = wallet.find(".tm-settings-item-desc").text().trim();
    info.walletVerified = wallet.find(".tm-badge-verified").length > 0;
  }

  return info;
}

/** Exported for unit testing. */
export function parseSessions(html: string): SessionList {
  const $ = cheerio.load(html);

  const account: SessionList["account"] = {};

  const userBtn = $(".tm-header-action .btn .tm-button-label").first();
  if (userBtn.length) account.username = userBtn.text().trim();

  const userImg = $(".tm-header-button-photo img").first();
  const imgSrc = userImg.attr("src");
  if (imgSrc) account.avatar = imgSrc;

  const wallet = $(".tm-wallet").first();
  if (wallet.length) account.tonWallet = wallet.text().trim();

  const script = $("script#aj_script").first();
  if (script.length) {
    const match = script.html()?.match(/Wallet\.init\((\{.*?\})\);/s);
    if (match) {
      try {
        Object.assign(account, JSON.parse(match[1]!));
      } catch {
        // ignore malformed wallet init payload
      }
    }
  }

  const sessions: Session[] = [];
  $("table.tm-table tbody tr").each((_, row) => {
    const $row = $(row);
    const session: Session = {};

    const device = $row.find(".table-cell-value.tm-value").first();
    if (device.length) session.device = device.text().trim();

    const status = $row.find(".table-cell-status-thin").first();
    if (status.length) session.status = status.text().trim();

    const location = $row.find(".table-cell-desc-col").first();
    if (location.length) session.location = location.text().trim();

    const time = $row.find("time").first();
    if (time.length) {
      session.datetime = time.attr("datetime");
      session.dateText = time.text().trim();
    } else {
      const dateCell = $row.find("td.wide-only .tm-value").first();
      if (dateCell.length) session.dateText = dateCell.text().trim();
    }

    const action = $row.find(".tm-table-actions").first();
    const sessionId = action.attr("data-session-id");
    if (sessionId) session.sessionId = sessionId;

    sessions.push(session);
  });

  return { account, sessions };
}
