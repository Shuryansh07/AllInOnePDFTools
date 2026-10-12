import { LIMITS } from "@/config/limits";
import { AppError, ERROR_CODES, isAppError, type ErrorCode } from "@/lib/errors/app-error";
import { clientIp } from "./client-ip";
import { ConcurrencyGate, positiveInt, RateLimiter } from "./limiter";

/**
 * Shared by every server-side PDF endpoint, so one budget covers them all.
 * Kept on globalThis so separately bundled routes still share a single instance.
 */
const shared = globalThis as typeof globalThis & {
  __pdfJobLimiter?: RateLimiter;
  __pdfJobUnknownLimiter?: RateLimiter;
  __pdfJobGate?: ConcurrencyGate;
  __pdfJobWarnedNoIp?: boolean;
};
const limiter = (shared.__pdfJobLimiter ??= new RateLimiter(10, 60_000));
// Used only when no client IP can be determined (misconfigured proxy header). Everyone shares
// this bucket, so it's deliberately generous: better to under-limit than to throttle the whole site.
const unknownLimiter = (shared.__pdfJobUnknownLimiter ??= new RateLimiter(120, 60_000));
// Lower this on small instances, where several large files at once can exhaust memory.
const gate = (shared.__pdfJobGate ??= new ConcurrencyGate(positiveInt(process.env.PDF_MAX_CONCURRENT_JOBS, 2)));

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  INVALID_FILE_TYPE: 415,
  FILE_TOO_LARGE: 413,
  EMPTY_FILE: 400,
  PASSWORD_REQUIRED: 400,
  INVALID_PASSWORD: 422,
  ENCRYPTED_PDF: 422,
  PROCESSING_FAILED: 422,
  RATE_LIMITED: 429,
  SERVER_BUSY: 503,
  TIMEOUT: 504,
};

export function errorResponse(error: unknown, label: string): Response {
  const appError = isAppError(error) ? error : new AppError(ERROR_CODES.UNKNOWN, { cause: error });

  // Log only what's useful; never the request body, form fields, or passwords.
  if (!isAppError(error)) {
    console.error(`[${label}] unexpected error`, error instanceof Error ? error.message : error);
  } else if (appError.code === ERROR_CODES.PROCESSING_FAILED || appError.code === ERROR_CODES.TIMEOUT) {
    console.error(`[${label}]`, appError.message);
  }

  return Response.json(
    { code: appError.code, message: appError.userMessage },
    { status: STATUS_BY_CODE[appError.code] ?? 500 },
  );
}

export interface PdfJobContext {
  bytes: Buffer;
  filename: string;
  form: FormData;
}

/**
 * Common pipeline for upload-a-PDF endpoints: rate limit, size check, concurrency cap,
 * multipart parsing, and content sniffing. `handler` does the actual work.
 */
export async function handlePdfJob(
  request: Request,
  label: string,
  handler: (context: PdfJobContext) => Promise<Response>,
): Promise<Response> {
  const ip = clientIp(request.headers);
  if (ip === "unknown" && !shared.__pdfJobWarnedNoIp) {
    shared.__pdfJobWarnedNoIp = true;
    // Header NAMES only (never values) so this is safe to log and shows what the proxy provides.
    const present = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "true-client-ip"].filter((name) =>
      request.headers.has(name),
    );
    console.warn(
      `[rate-limit] No client IP found using header "${process.env.TRUSTED_PROXY_HEADER ?? "x-forwarded-for"}". ` +
        `Candidate headers present: ${present.length ? present.join(", ") : "none"}. ` +
        "Set TRUSTED_PROXY_HEADER to the one your proxy controls.",
    );
  }
  const allowed = ip === "unknown" ? unknownLimiter.allow("unknown") : limiter.allow(ip);
  if (!allowed) {
    return errorResponse(new AppError(ERROR_CODES.RATE_LIMITED), label);
  }

  // Reject oversized bodies before buffering them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LIMITS.maxFileSizeBytes + 1024 * 1024) {
    return errorResponse(
      new AppError(ERROR_CODES.FILE_TOO_LARGE, { userMessage: "This file is too large to process." }),
      label,
    );
  }

  if (!gate.tryAcquire()) {
    return errorResponse(new AppError(ERROR_CODES.SERVER_BUSY), label);
  }

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!form || !(file instanceof File)) {
      throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, { userMessage: "Upload a PDF file to continue." });
    }
    if (file.size === 0) throw new AppError(ERROR_CODES.EMPTY_FILE);
    if (file.size > LIMITS.maxFileSizeBytes) {
      throw new AppError(ERROR_CODES.FILE_TOO_LARGE, { userMessage: "This file is too large to process." });
    }

    // Trust the content, not the declared MIME type.
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 1024).indexOf("%PDF-") === -1) {
      throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, { userMessage: "This doesn't look like a PDF file." });
    }

    return await handler({ bytes, filename: file.name, form });
  } catch (error) {
    return errorResponse(error, label);
  } finally {
    gate.release();
  }
}

/** Standard success response for a processed PDF. */
export function pdfResponse(bytes: Buffer, headers: Record<string, string> = {}): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
