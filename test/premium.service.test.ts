import { describe, expect, it } from "vitest";
import { parsePremium } from "../src/services/premium.service.js";
import { createClient, expectOk } from "./helpers.js";

const PREMIUM_HTML = `
<html><body>
  <div class="tm-form-radio-item">
    <span class="tm-radio-label">3 months<span class="tm-radio-label-badge">-10%</span></span>
    <span class="tm-value">9</span>
    <span class="tm-radio-desc">$19.99</span>
  </div>
  <div class="tm-form-radio-item">
    <span class="tm-radio-label">12 months</span>
    <span class="tm-value">28</span>
    <span class="tm-radio-desc">$59.99</span>
  </div>
  <script>ajInit({"state":{"tonRate":5.42}});</script>
</body></html>`;

describe("parsePremium", () => {
  it("extracts options and the ton rate", () => {
    const data = parsePremium(PREMIUM_HTML);
    expect(data.options).toHaveLength(2);
    expect(data.options[0]).toMatchObject({
      duration: "3 months-10%",
      priceTon: "9",
      priceUsd: "$19.99",
      sale: "-10%",
    });
    expect(data.options[1]?.sale).toBeNull();
    expect(data.tonRate).toBe(5.42);
  });

  it("returns null ton rate when ajInit is absent", () => {
    expect(parsePremium("<div></div>").tonRate).toBeNull();
  });
});

describe("premium.getPrice", () => {
  it("fetches and parses the gift page", async () => {
    const { client, mock } = createClient();
    mock.onGet(/premium\/gift/).reply(200, PREMIUM_HTML);
    const data = expectOk(await client.premium.getPrice({ months: 12 }));
    expect(data.tonRate).toBe(5.42);
    expect(data.options).toHaveLength(2);
  });

  it("defaults to 12 months", async () => {
    const { client, mock } = createClient();
    let url = "";
    mock.onGet(/premium\/gift/).reply((config) => {
      url = config.url ?? "";
      return [200, PREMIUM_HTML];
    });
    await client.premium.getPrice();
    expect(url).toContain("months=12");
  });
});
