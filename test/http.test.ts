import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { HttpClient } from "../src/core/http.js";

function setup() {
  const instance = axios.create();
  const mock = new MockAdapter(instance);
  const http = new HttpClient({ axiosInstance: instance });
  return { http, mock };
}

describe("HttpClient error mapping", () => {
  it("returns ok with parsed JSON on 200", async () => {
    const { http, mock } = setup();
    mock.onGet("https://x.test/j").reply(200, { hello: "world" });
    const res = await http.getJson<{ hello: string }>("https://x.test/j");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hello).toBe("world");
  });

  it("maps 401/403 to an AUTH error", async () => {
    const { http, mock } = setup();
    mock.onGet("https://x.test/a").reply(403, { error: "forbidden" });
    const res = await http.getJson("https://x.test/a");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("AUTH");
      expect(res.error.status).toBe(403);
    }
  });

  it("maps other non-2xx to an API error", async () => {
    const { http, mock } = setup();
    mock.onGet("https://x.test/e").reply(500);
    const res = await http.getJson("https://x.test/e");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("API");
      expect(res.error.status).toBe(500);
    }
  });

  it("maps connection failures to a NETWORK error", async () => {
    const { http, mock } = setup();
    mock.onGet("https://x.test/n").networkError();
    const res = await http.getJson("https://x.test/n");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NETWORK");
  });

  it("posts urlencoded form data", async () => {
    const { http, mock } = setup();
    let seenBody = "";
    mock.onPost("https://x.test/p").reply((config) => {
      seenBody = String(config.data);
      return [200, { ok: true }];
    });
    await http.postForm("https://x.test/p", { method: "doThing", n: 5 });
    expect(seenBody).toContain("method=doThing");
    expect(seenBody).toContain("n=5");
  });
});
