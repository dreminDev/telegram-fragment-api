import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Fragment } from "../src/Fragment.js";
import type { FragmentCredentials } from "../src/core/config.js";

/**
 * Build a Fragment client backed by a mocked axios instance.
 * Returns the client plus the {@link MockAdapter} to stub requests.
 */
export function createClient(credentials: FragmentCredentials = {}) {
  const instance = axios.create();
  const mock = new MockAdapter(instance);
  const client = new Fragment({
    hash: "test_hash",
    stelSsid: "ssid",
    stelToken: "token",
    stelTonToken: "ton_token",
    ...credentials,
    axiosInstance: instance,
  });
  return { client, mock };
}

/** Assert a result is `ok` and return its data (throws with context otherwise). */
export function expectOk<T>(
  result: { ok: true; data: T } | { ok: false; error: { code: string; message: string } },
): T {
  if (!result.ok) {
    throw new Error(`Expected ok result, got error ${result.error.code}: ${result.error.message}`);
  }
  return result.data;
}
