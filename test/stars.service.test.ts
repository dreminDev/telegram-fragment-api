import { describe, expect, it } from "vitest";
import { createClient, expectOk } from "./helpers.js";

// Real-world shape returned by Fragment's `updateStarsPrices`.
const PRICE_HTML =
  '<div class="tm-value icon-before icon-ton">44<span class="mini-frac">.6172</span></div>' +
  '<div class="tm-radio-desc wide-only">&#036;75.75</div>';

describe("stars.getPrice", () => {
  it("parses TON and USD out of the price HTML", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: true, cur_price: PRICE_HTML });

    const data = expectOk(await client.stars.getPrice({ quantity: 5050 }));
    expect(data.curPrice.TON).toBe("44.6172");
    expect(data.curPrice.USDT).toBe("75.75");
  });

  it("also parses a literal `$` USD price", async () => {
    const { client, mock } = createClient();
    const html =
      '<div class="icon-ton">1<span class="mini-frac">.0</span></div>$2.50';
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: true, cur_price: html });
    const data = expectOk(await client.stars.getPrice({ quantity: 100 }));
    expect(data.curPrice.USDT).toBe("2.50");
  });

  it("accepts a numeric string quantity", async () => {
    const { client, mock } = createClient();
    let body = "";
    mock.onPost(/fragment\.com\/api/).reply((config) => {
      body = String(config.data);
      return [200, { ok: true, cur_price: PRICE_HTML }];
    });
    await client.stars.getPrice({ quantity: "100" });
    expect(body).toContain("quantity=100");
    expect(body).toContain("method=updateStarsPrices");
  });

  it("rejects a non-positive quantity", async () => {
    const { client } = createClient();
    const res = await client.stars.getPrice({ quantity: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("returns an API error when ok=false", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: false });
    const res = await client.stars.getPrice({ quantity: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("API");
  });
});

describe("stars.initPayment", () => {
  it("returns req_id and sends payment_method (default ton)", async () => {
    const { client, mock } = createClient();
    let body = "";
    mock.onPost(/fragment\.com\/api/).reply((config) => {
      body = String(config.data);
      return [200, { req_id: "abc123", amount: "0.2774" }];
    });
    const data = expectOk(await client.stars.initPayment({ recipient: "R", quantity: 50 }));
    expect(data.req_id).toBe("abc123");
    expect(body).toContain("payment_method=ton");
    expect(body).toContain("method=initBuyStarsRequest");
  });

  it("forwards a custom payment method", async () => {
    const { client, mock } = createClient();
    let body = "";
    mock.onPost(/fragment\.com\/api/).reply((config) => {
      body = String(config.data);
      return [200, { req_id: "x", amount: "1" }];
    });
    await client.stars.initPayment({ recipient: "R", quantity: 50, paymentMethod: "usdt_ton" });
    expect(body).toContain("payment_method=usdt_ton");
  });

  it("maps need_ton to an AUTH error", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { need_ton: true });
    const res = await client.stars.initPayment({ recipient: "R", quantity: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("AUTH");
  });

  it("validates the recipient", async () => {
    const { client } = createClient();
    const res = await client.stars.initPayment({ recipient: "", quantity: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("errors when no req_id is returned", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { amount: "0" });
    const res = await client.stars.initPayment({ recipient: "R", quantity: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("API");
  });
});

describe("stars.getPaymentInfo", () => {
  it("returns the transaction messages and sends show_sender + transaction", async () => {
    const { client, mock } = createClient();
    let body = "";
    mock.onPost(/fragment\.com\/api/).reply((config) => {
      body = String(config.data);
      return [
        200,
        {
          ok: true,
          transaction: {
            messages: [{ address: "UQ...", amount: "277400000", payload: "te6..." }],
          },
        },
      ];
    });
    const data = expectOk(
      await client.stars.getPaymentInfo({ requestId: "abc123", showSender: true }),
    );
    expect(data.transaction?.messages[0]?.address).toBe("UQ...");
    expect(body).toContain("show_sender=1");
    expect(body).toContain("transaction=1");
    expect(body).toContain("id=abc123");
  });

  it("maps need_verify to an AUTH error", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: true, need_verify: true });
    const res = await client.stars.getPaymentInfo({ requestId: "abc123" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("AUTH");
  });

  it("errors when transaction is missing", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: false, error: "expired" });
    const res = await client.stars.getPaymentInfo({ requestId: "abc123" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.message).toContain("expired");
  });
});
