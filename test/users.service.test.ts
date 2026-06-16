import { describe, expect, it } from "vitest";
import { createClient, expectOk } from "./helpers.js";

describe("users.nickToHash", () => {
  it("returns the recipient on a successful lookup", async () => {
    const { client, mock } = createClient();
    let body = "";
    mock.onPost(/fragment\.com\/api/).reply((config) => {
      body = String(config.data);
      return [
        200,
        { ok: true, found: { recipient: "LE8nypspi4yC4", name: "Pavel" } },
      ];
    });

    const res = await client.users.nickToHash({ nickname: "durov" });
    const data = expectOk(res);
    expect(data.found?.recipient).toBe("LE8nypspi4yC4");
    expect(body).toContain("method=searchStarsRecipient");
    expect(body).toContain("query=durov");
  });

  it("returns NOT_FOUND when the API has no recipient", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(200, { ok: false, error: "unknown user" });

    const res = await client.users.nickToHash({ nickname: "ghost" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
      expect(res.error.message).toContain("unknown user");
    }
  });

  it("validates an empty nickname without hitting the network", async () => {
    const { client, mock } = createClient();
    const res = await client.users.nickToHash({ nickname: "  " });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
    expect(mock.history.post).toHaveLength(0);
  });

  it("propagates an AUTH error from the transport", async () => {
    const { client, mock } = createClient();
    mock.onPost(/fragment\.com\/api/).reply(403);
    const res = await client.users.nickToHash({ nickname: "durov" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("AUTH");
  });
});
