import { describe, expect, it } from "vitest";
import {
  FragmentError,
  apiError,
  authError,
  validationError,
} from "../src/core/errors.js";
import { err, isErr, isOk, ok } from "../src/core/result.js";
import {
  buildApiHeaders,
  buildCookieHeader,
  resolveCredentials,
} from "../src/core/config.js";

describe("Result helpers", () => {
  it("ok() builds a success result", () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
  });

  it("err() builds a failure result", () => {
    const e = validationError("bad");
    const r = err(e);
    expect(r).toEqual({ ok: false, error: e });
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
  });
});

describe("FragmentError", () => {
  it("carries a code, message and status", () => {
    const e = apiError("nope", { status: 500 });
    expect(e).toBeInstanceOf(FragmentError);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("API");
    expect(e.status).toBe(500);
  });

  it("serializes to a plain object via toJSON", () => {
    const e = authError("denied", { status: 403 });
    expect(e.toJSON()).toEqual({
      name: "FragmentError",
      code: "AUTH",
      message: "denied",
      status: 403,
    });
  });
});

describe("config helpers", () => {
  it("fills defaults and keeps stelDt fallback", () => {
    const creds = resolveCredentials({ hash: "h" });
    expect(creds.hash).toBe("h");
    expect(creds.stelDt).toBe("-180");
    expect(creds.toncenterApiKey).toBe("");
  });

  it("builds the cookie header from stel_* tokens", () => {
    const creds = resolveCredentials({
      stelSsid: "a",
      stelToken: "b",
      stelTonToken: "c",
    });
    expect(buildCookieHeader(creds)).toBe(
      "stel_ssid=a; stel_dt=-180; stel_token=b; stel_ton_token=c",
    );
  });

  it("includes the cookie and XHR markers in api headers", () => {
    const headers = buildApiHeaders(resolveCredentials({ stelSsid: "a" }));
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(headers["Cookie"]).toContain("stel_ssid=a");
    expect(headers["Content-Type"]).toContain("x-www-form-urlencoded");
  });
});
