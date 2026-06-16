/**
 * Thin axios wrapper. Every method returns a {@link Result} — transport and
 * HTTP errors are mapped to a structured {@link FragmentError} instead of being
 * thrown.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { FragmentError } from "./errors.js";
import { err, ok, type Result } from "./result.js";

export interface HttpClientOptions {
  /** Inject a pre-built axios instance (used by tests). */
  axiosInstance?: AxiosInstance;
  /** Request timeout in ms (default `30000`). Ignored if `axiosInstance` is set. */
  timeout?: number;
}

export interface RequestOptions {
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export class HttpClient {
  /** The underlying axios instance (exposed so tests can mock it). */
  readonly axios: AxiosInstance;

  constructor(options: HttpClientOptions = {}) {
    this.axios =
      options.axiosInstance ??
      axios.create({ timeout: options.timeout ?? 30_000 });
  }

  /** POST `application/x-www-form-urlencoded`, parse a JSON response. */
  async postForm<T>(
    url: string,
    data: Record<string, string | number>,
    options: RequestOptions = {},
  ): Promise<Result<T>> {
    const body = new URLSearchParams(
      Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)]),
      ),
    );
    return this.request<T>({
      method: "POST",
      url,
      data: body,
      params: options.params,
      headers: options.headers,
    });
  }

  /** GET, parse a JSON response. */
  async getJson<T>(
    url: string,
    options: RequestOptions = {},
  ): Promise<Result<T>> {
    return this.request<T>({
      method: "GET",
      url,
      params: options.params,
      headers: options.headers,
    });
  }

  /** GET, return the raw response body as text. */
  async getText(
    url: string,
    options: RequestOptions = {},
  ): Promise<Result<string>> {
    return this.request<string>({
      method: "GET",
      url,
      params: options.params,
      headers: options.headers,
      responseType: "text",
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<Result<T>> {
    try {
      const response = await this.axios.request<T>(config);
      return ok(response.data);
    } catch (error) {
      return err(this.toFragmentError(error));
    }
  }

  private toFragmentError(error: unknown): FragmentError {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return new FragmentError(
            "AUTH",
            `Authentication failed (HTTP ${status}). Check your stel_* cookies and hash.`,
            { status, details: error.response.data, cause: error },
          );
        }
        return new FragmentError(
          "API",
          `Request failed with HTTP ${status}.`,
          { status, details: error.response.data, cause: error },
        );
      }
      // Request was made but no response (timeout / connection error).
      return new FragmentError(
        "NETWORK",
        error.message || "Network request failed with no response.",
        { cause: error },
      );
    }
    return new FragmentError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Unknown error",
      { cause: error },
    );
  }
}
