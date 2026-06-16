/**
 * Shared runtime state handed to every service: the resolved (mutable)
 * credentials and the HTTP client.
 */

import {
  buildApiHeaders,
  buildHtmlHeaders,
  resolveCredentials,
  type FragmentConfig,
  type FragmentCredentials,
  type ResolvedCredentials,
} from "./config.js";
import { HttpClient } from "./http.js";

export class FragmentContext {
  /** Live credentials — mutated by `update()` and `auth.fetchHash()`. */
  credentials: ResolvedCredentials;
  readonly http: HttpClient;

  constructor(config: FragmentConfig = {}) {
    this.credentials = resolveCredentials(config);
    this.http = new HttpClient({
      axiosInstance: config.axiosInstance,
      timeout: config.timeout,
    });
  }

  /** Merge in new credential values. */
  update(creds: Partial<FragmentCredentials>): void {
    this.credentials = { ...this.credentials, ...stripUndefined(creds) };
  }

  /** `https://fragment.com/api?hash=...` for the configured hash. */
  apiUrl(): string {
    return `https://fragment.com/api?hash=${encodeURIComponent(this.credentials.hash)}`;
  }

  apiHeaders(): Record<string, string> {
    return buildApiHeaders(this.credentials);
  }

  htmlHeaders(): Record<string, string> {
    return buildHtmlHeaders(this.credentials);
  }
}

function stripUndefined(
  obj: Partial<FragmentCredentials>,
): Partial<FragmentCredentials> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

/** Base class for all services — just holds the shared context. */
export abstract class BaseService {
  constructor(protected readonly ctx: FragmentContext) {}
}
