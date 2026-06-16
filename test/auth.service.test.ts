import { describe, expect, it } from "vitest";
import { createClient, expectOk } from "./helpers.js";

describe("auth.fetchHash", () => {
  it("extracts the api hash from the page and stores it", async () => {
    const { client, mock } = createClient({ hash: "" });
    const html = `<script>var apiUrl = "/api?hash=0123456789abcdef0123";</script>`;
    mock.onGet("https://fragment.com/").reply(200, html);

    const data = expectOk(await client.auth.fetchHash());
    expect(data.hash).toBe("0123456789abcdef0123");
    // the hash is persisted into the client config
    expect(client.getCredentials().hash).toBe("0123456789abcdef0123");
  });

  it("returns a PARSE error when no hash is found", async () => {
    const { client, mock } = createClient();
    mock.onGet("https://fragment.com/").reply(200, "<html>no hash here</html>");
    const res = await client.auth.fetchHash();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("PARSE");
  });

  it("accepts a custom url", async () => {
    const { client, mock } = createClient();
    let requested = "";
    mock.onGet(/fragment\.com/).reply((config) => {
      requested = config.url ?? "";
      return [200, `<a href="/api?hash=aaaaaaaaaaaaaaaaaaaa">x</a>`];
    });
    await client.auth.fetchHash({ url: "https://fragment.com/stars" });
    expect(requested).toBe("https://fragment.com/stars");
  });
});
