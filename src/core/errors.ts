/**
 * Structured error type returned inside {@link Result} objects.
 *
 * Errors are never thrown by the public API — every method returns
 * `{ ok: false, error: FragmentError }` on failure. `FragmentError` still
 * extends `Error` so it carries a stack trace and works with `instanceof`.
 */

/** Discriminator describing the category of a failure. */
export type FragmentErrorCode =
  /** Bad or missing input parameters. */
  | "VALIDATION"
  /** Missing/invalid credentials, or a 401/403 from Fragment. */
  | "AUTH"
  /** Transport failure: timeout, DNS, connection reset, etc. */
  | "NETWORK"
  /** The remote API responded but signalled an error (non-2xx or `ok: false`). */
  | "API"
  /** The response could not be parsed into the expected shape. */
  | "PARSE"
  /** A resource was not found (e.g. nickname has no recipient). */
  | "NOT_FOUND"
  /** Wallet balance is lower than the requested transfer amount. */
  | "INSUFFICIENT_FUNDS"
  /** Anything that doesn't fit the buckets above. */
  | "UNKNOWN";

/** Extra context attached to a {@link FragmentError}. */
export interface FragmentErrorOptions {
  /** HTTP status code, when the failure came from an HTTP response. */
  status?: number;
  /** The underlying error / payload that caused this one. */
  cause?: unknown;
  /** Arbitrary structured details (e.g. the raw API body). */
  details?: unknown;
}

export class FragmentError extends Error {
  readonly code: FragmentErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: FragmentErrorCode,
    message: string,
    options: FragmentErrorOptions = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "FragmentError";
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    // Restore prototype chain for instanceof when targeting ES5-ish output.
    Object.setPrototypeOf(this, FragmentError.prototype);
  }

  /** Serialize to a plain object (safe for logging / JSON). */
  toJSON(): {
    name: string;
    code: FragmentErrorCode;
    message: string;
    status?: number;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
    };
  }
}

// ---- Convenience constructors --------------------------------------------

export const validationError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("VALIDATION", message, options);

export const authError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("AUTH", message, options);

export const networkError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("NETWORK", message, options);

export const apiError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("API", message, options);

export const parseError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("PARSE", message, options);

export const notFoundError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("NOT_FOUND", message, options);

export const insufficientFundsError = (
  message: string,
  options?: FragmentErrorOptions,
): FragmentError => new FragmentError("INSUFFICIENT_FUNDS", message, options);
