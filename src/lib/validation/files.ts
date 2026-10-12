import { ACCEPTED_MIME, LIMITS } from "@/config/limits";
import { AppError, ERROR_CODES } from "@/lib/errors";

interface ValidateOptions {
  accept?: readonly string[];
  maxSizeBytes?: number;
}

/** Throws AppError for the first problem found. Run on selection, before processing. */
export function validateFile(file: File, options: ValidateOptions = {}): void {
  const { accept = ACCEPTED_MIME.pdf, maxSizeBytes = LIMITS.maxFileSizeBytes } = options;

  if (file.size === 0) {
    throw new AppError(ERROR_CODES.EMPTY_FILE, {
      userMessage: `"${file.name}" is empty.`,
    });
  }

  if (!accept.includes(file.type)) {
    throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, {
      userMessage: `"${file.name}" isn't a supported file type.`,
    });
  }

  if (file.size > maxSizeBytes) {
    const mb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new AppError(ERROR_CODES.FILE_TOO_LARGE, {
      userMessage: `"${file.name}" is larger than ${mb} MB.`,
    });
  }
}

export function validateFileCount(current: number, adding: number, max: number = LIMITS.maxFilesPerJob): void {
  if (current + adding > max) {
    throw new AppError(ERROR_CODES.TOO_MANY_FILES, {
      userMessage: `You can add up to ${max} files at a time.`,
    });
  }
}
