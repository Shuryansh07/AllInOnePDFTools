export const ERROR_CODES = {
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  EMPTY_FILE: "EMPTY_FILE",
  TOO_MANY_FILES: "TOO_MANY_FILES",
  TOO_FEW_FILES: "TOO_FEW_FILES",
  INVALID_PAGE_RANGE: "INVALID_PAGE_RANGE",
  ENCRYPTED_PDF: "ENCRYPTED_PDF",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
  CORRUPT_PDF: "CORRUPT_PDF",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_BUSY: "SERVER_BUSY",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** User-facing messages. Never expose raw exception text in the UI. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_FILE_TYPE: "This file type isn't supported. Please choose a PDF file.",
  FILE_TOO_LARGE: "This file is too large. Please choose a smaller file.",
  EMPTY_FILE: "This file is empty. Please choose a different file.",
  TOO_MANY_FILES: "You've selected too many files.",
  TOO_FEW_FILES: "Please add more files to continue.",
  INVALID_PAGE_RANGE: "Enter a valid page range, for example 1-3, 5.",
  ENCRYPTED_PDF: "This PDF is password protected. Unlock it first and try again.",
  INVALID_PASSWORD: "That password is incorrect.",
  PASSWORD_REQUIRED: "Enter a password to continue.",
  CORRUPT_PDF: "This PDF appears to be damaged and can't be read.",
  PROCESSING_FAILED: "Something went wrong while processing your file. Please try again.",
  NETWORK_ERROR: "Network problem. Check your connection and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  SERVER_BUSY: "The server is busy right now. Please try again shortly.",
  TIMEOUT: "This file took too long to process. Try a smaller file.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    options: { message?: string; userMessage?: string; cause?: unknown; recoverable?: boolean } = {},
  ) {
    super(options.message ?? options.userMessage ?? ERROR_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.userMessage = options.userMessage ?? ERROR_MESSAGES[code];
    this.recoverable = options.recoverable ?? true;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
