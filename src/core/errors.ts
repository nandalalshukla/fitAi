/**
 * Typed error handling. Domain and data layers return `Result<T, E>` instead of
 * throwing so callers must handle failure explicitly.
 */
export type ErrorCode =
  | 'unknown'
  | 'network'
  | 'not_found'
  | 'validation'
  | 'unauthorized'
  | 'permission_denied'
  | 'storage'
  | 'model_load';

export class AppError extends Error {
  readonly code: ErrorCode;
  override readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }

  static from(error: unknown, code: ErrorCode = 'unknown'): AppError {
    if (error instanceof AppError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new AppError(code, message, error);
  }
}

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Runs an async function and captures thrown errors as an `Err<AppError>`. */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  code: ErrorCode = 'unknown',
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(AppError.from(e, code));
  }
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
