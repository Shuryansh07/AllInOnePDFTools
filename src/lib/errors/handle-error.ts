import { toast } from "sonner";
import { AppError, ERROR_CODES, isAppError } from "./app-error";

/** Normalize any thrown value into an AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new AppError(ERROR_CODES.NETWORK_ERROR, { cause: error });
  }

  if (error instanceof Error && /encrypt|password/i.test(error.message)) {
    return new AppError(ERROR_CODES.ENCRYPTED_PDF, { cause: error });
  }

  if (error instanceof Error && /invalid pdf|failed to parse|no pdf header/i.test(error.message)) {
    return new AppError(ERROR_CODES.CORRUPT_PDF, { cause: error });
  }

  return new AppError(ERROR_CODES.UNKNOWN, { cause: error });
}

/**
 * Single entry point for surfacing errors to the user.
 * Logs the real error, shows a friendly toast, and returns the normalized error
 * so callers can also update their own state.
 */
export function handleError(error: unknown): AppError {
  const appError = toAppError(error);
  console.error(`[${appError.code}]`, appError.cause ?? appError);
  toast.error(appError.userMessage);
  return appError;
}
