/**
 * Credentials and runtime configuration for a {@link Fragment} client.
 */

import type { AxiosInstance } from "axios";

/** Credentials grabbed from an authenticated fragment.com session + TON providers. */
export interface FragmentCredentials {
  /** Per-request CSRF hash from the Fragment page (`?hash=...`). */
  hash?: string;
  /** Cookie: `stel_ssid`. */
  stelSsid?: string;
  /** Cookie: `stel_dt` (timezone offset, e.g. `"-180"`). */
  stelDt?: string;
  /** Cookie: `stel_token`. */
  stelToken?: string;
  /** Cookie: `stel_ton_token`. */
  stelTonToken?: string;
  /** API key for toncenter.com (balances + sending TON). */
  toncenterApiKey?: string;
  /** API key for tonconsole / tonapi.io (alternative balance source). */
  tonconsoleApiKey?: string;
  /** Wallet mnemonic seed (space-separated words) — only needed to send TON. */
  walletSeed?: string;
}

/** Full client configuration: credentials plus transport options. */
export interface FragmentConfig extends FragmentCredentials {
  /** Request timeout in milliseconds (default `30000`). */
  timeout?: number;
  /**
   * Inject a custom axios instance — primarily for testing
   * (e.g. with `axios-mock-adapter`).
   */
  axiosInstance?: AxiosInstance;
}

/** Credentials with all fields present (empty string when unset). */
export type ResolvedCredentials = Required<FragmentCredentials>;

const DEFAULTS: ResolvedCredentials = {
  hash: "",
  stelSsid: "",
  stelDt: "-180",
  stelToken: "",
  stelTonToken: "",
  toncenterApiKey: "",
  tonconsoleApiKey: "",
  walletSeed: "",
};

/** Fill missing credential fields with defaults. */
export function resolveCredentials(
  creds: FragmentCredentials = {},
): ResolvedCredentials {
  return {
    hash: creds.hash ?? DEFAULTS.hash,
    stelSsid: creds.stelSsid ?? DEFAULTS.stelSsid,
    stelDt: creds.stelDt ?? DEFAULTS.stelDt,
    stelToken: creds.stelToken ?? DEFAULTS.stelToken,
    stelTonToken: creds.stelTonToken ?? DEFAULTS.stelTonToken,
    toncenterApiKey: creds.toncenterApiKey ?? DEFAULTS.toncenterApiKey,
    tonconsoleApiKey: creds.tonconsoleApiKey ?? DEFAULTS.tonconsoleApiKey,
    walletSeed: creds.walletSeed ?? DEFAULTS.walletSeed,
  };
}

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0";

/** Build the `Cookie` header value from the configured stel_* tokens. */
export function buildCookieHeader(creds: ResolvedCredentials): string {
  return [
    `stel_ssid=${creds.stelSsid}`,
    `stel_dt=${creds.stelDt}`,
    `stel_token=${creds.stelToken}`,
    `stel_ton_token=${creds.stelTonToken}`,
  ].join("; ");
}

/** Headers for the JSON `https://fragment.com/api` endpoint. */
export function buildApiHeaders(
  creds: ResolvedCredentials,
): Record<string, string> {
  return {
    Cookie: buildCookieHeader(creds),
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    Origin: "https://fragment.com",
    Referer: "https://fragment.com/stars/buy?quantity=500",
  };
}

/** Headers for the HTML page-scraping endpoints (profile, sessions, premium). */
export function buildHtmlHeaders(
  creds: ResolvedCredentials,
): Record<string, string> {
  return {
    Cookie: buildCookieHeader(creds),
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
    "Upgrade-Insecure-Requests": "1",
  };
}
