import { describe, expect, it } from "vitest";
import { decodePayload } from "../src/parsers/decoder.js";
import { createClient } from "./helpers.js";

const KNOWN_PAYLOAD =
  "te6ccgEBAQEAJwAaSgAAAAA1MCBUZWxlZ3JhbSBTdGFycyAKClJlZiNJbTJ5NWl0ZDY";

describe("decodePayload (pure)", () => {
  it("decodes a known Fragment payload to its comment text", () => {
    expect(decodePayload(KNOWN_PAYLOAD)).toBe(
      "50 Telegram Stars \n\nRef#Im2y5itd6",
    );
  });

  it("pads base64 strings that are not a multiple of 4", () => {
    // "Hi there friend" has length not divisible by 4 once base64-encoded.
    const encoded = Buffer.from("Hi there friend").toString("base64").replace(/=+$/, "");
    expect(decodePayload(encoded)).toContain("Hi there friend");
  });

  it("trims surrounding newlines", () => {
    const encoded = Buffer.from("\r\nhello world\r\n").toString("base64");
    expect(decodePayload(encoded)).toBe("hello world");
  });

  it("falls back to raw utf-8 for non-printable bytes", () => {
    // [0,0,0] has no printable run — falls through to the utf-8 branch.
    const encoded = Buffer.from([0, 0, 0]).toString("base64");
    expect(typeof decodePayload(encoded)).toBe("string");
  });

  it("falls back to hex when nothing decodes to text", () => {
    // two spaces: shorter than the printable-run threshold and trims to "".
    expect(decodePayload(Buffer.from([0x20, 0x20]).toString("base64"))).toBe("2020");
  });

  it("returns an empty string for an empty payload", () => {
    expect(decodePayload("")).toBe("");
  });
});

describe("utils.decodePayload (service)", () => {
  it("wraps the decoded text in an ok result", () => {
    const { client } = createClient();
    const res = client.utils.decodePayload({ payload: KNOWN_PAYLOAD });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.payload).toBe(KNOWN_PAYLOAD);
      expect(res.data.decoded).toBe("50 Telegram Stars \n\nRef#Im2y5itd6");
    }
  });

  it("rejects an empty payload with a VALIDATION error", () => {
    const { client } = createClient();
    const res = client.utils.decodePayload({ payload: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });
});
