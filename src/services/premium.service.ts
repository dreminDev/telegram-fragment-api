import * as cheerio from "cheerio";
import { BaseService } from "../core/context.js";
import { ok, type Result } from "../core/result.js";
import type {
  GetPremiumPriceParams,
  PremiumOption,
  PremiumPrice,
} from "../types.js";

/** Telegram Premium gift pricing (scraped from the gift page). */
export class PremiumService extends BaseService {
  /**
   * Get Telegram Premium gift pricing options for a given duration.
   *
   * @example
   * ```ts
   * const res = await client.premium.getPrice({ months: 12 });
   * if (res.ok) console.log(res.data.tonRate, res.data.options);
   * ```
   */
  async getPrice({
    months = 12,
  }: GetPremiumPriceParams = {}): Promise<Result<PremiumPrice>> {
    const url = `https://fragment.com/premium/gift?months=${months}`;
    const res = await this.ctx.http.getText(url, {
      headers: this.ctx.htmlHeaders(),
    });
    if (!res.ok) return res;

    return ok(parsePremium(res.data));
  }
}

/** Exported for unit testing. */
export function parsePremium(html: string): PremiumPrice {
  const $ = cheerio.load(html);

  const options: PremiumOption[] = [];
  $(".tm-form-radio-item").each((_, el) => {
    const item = $(el);
    const pick = (sel: string): string | null => {
      const node = item.find(sel).first();
      return node.length ? node.text().trim() : null;
    };
    options.push({
      duration: pick(".tm-radio-label"),
      priceTon: pick(".tm-value"),
      priceUsd: pick(".tm-radio-desc"),
      sale: pick(".tm-radio-label-badge"),
    });
  });

  let tonRate: number | null = null;
  const marker = "ajInit(";
  const start = html.indexOf(marker);
  if (start !== -1) {
    const from = start + marker.length;
    const end = html.indexOf(");", from);
    if (end !== -1) {
      try {
        const aj = JSON.parse(html.slice(from, end)) as {
          state?: { tonRate?: number };
        };
        tonRate = aj.state?.tonRate ?? null;
      } catch {
        // leave tonRate as null
      }
    }
  }

  return { options, tonRate };
}
