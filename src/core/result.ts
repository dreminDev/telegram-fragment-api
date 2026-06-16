/**
 * A discriminated-union result type. Every public method resolves to one of
 * these instead of throwing.
 *
 * ```ts
 * const res = await client.stars.getPrice({ quantity: 50 });
 * if (res.ok) {
 *   console.log(res.data.curPrice.TON);
 * } else {
 *   console.error(res.error.code, res.error.message);
 * }
 * ```
 */

import { FragmentError } from "./errors.js";

export interface Ok<T> {
  ok: true;
  data: T;
}

export interface Err<E = FragmentError> {
  ok: false;
  error: E;
}

export type Result<T, E = FragmentError> = Ok<T> | Err<E>;

/** Build a success result. */
export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

/** Build a failure result. */
export function err<E = FragmentError>(error: E): Err<E> {
  return { ok: false, error };
}

/** Type guard narrowing a {@link Result} to its success branch. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Type guard narrowing a {@link Result} to its failure branch. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
