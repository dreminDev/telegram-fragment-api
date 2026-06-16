import { describe, expect, it } from "vitest";
import { intToIp } from "../src/services/ton.service.js";
import { createClient, expectOk } from "./helpers.js";

const CONFIG = {
  liteservers: [{ ip: -1670711412, port: 53312, id: { "@type": "x", key: "k" } }],
};

describe("intToIp", () => {
  it("converts a negative int32 to dotted decimal", () => {
    expect(intToIp(-1670711412)).toBe("156.106.247.140");
  });
  it("converts a positive int", () => {
    expect(intToIp(2130706433)).toBe("127.0.0.1");
  });
});

describe("ton.getRandomLiteServer", () => {
  it("returns a server with a readable IP", async () => {
    const { client, mock } = createClient();
    mock.onGet(/global\.config\.json/).reply(200, CONFIG);
    const data = expectOk(await client.ton.getRandomLiteServer());
    expect(data.ip_readable).toBe("156.106.247.140");
    expect(data.port).toBe(53312);
  });

  it("errors when there are no liteservers", async () => {
    const { client, mock } = createClient();
    mock.onGet(/global\.config\.json/).reply(200, { liteservers: [] });
    const res = await client.ton.getRandomLiteServer();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NOT_FOUND");
  });
});

describe("ton.wallet.getBalance", () => {
  it("uses toncenter when its key is set", async () => {
    const { client, mock } = createClient({ toncenterApiKey: "tc" });
    mock.onGet(/toncenter\.com/).reply(200, { ok: true, result: "1500000000" });
    const data = expectOk(await client.ton.wallet.getBalance({ address: "UQabc" }));
    expect(data.nano).toBe(1_500_000_000);
    expect(data.ton).toBe(1.5);
    expect(data.source).toBe("toncenter");
  });

  it("falls back to tonconsole when only that key is set", async () => {
    const { client, mock } = createClient({
      toncenterApiKey: "",
      tonconsoleApiKey: "tk",
    });
    mock.onGet(/tonapi\.io/).reply(200, { balance: 2_000_000_000 });
    const data = expectOk(await client.ton.wallet.getBalance({ address: "UQabc" }));
    expect(data.ton).toBe(2);
    expect(data.source).toBe("tonconsole");
  });

  it("validates that some API key is present", async () => {
    const { client } = createClient({ toncenterApiKey: "", tonconsoleApiKey: "" });
    const res = await client.ton.wallet.getBalance({ address: "UQabc" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });
});
