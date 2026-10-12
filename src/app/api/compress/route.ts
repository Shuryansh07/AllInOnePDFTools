import { LIMITS } from "@/config/limits";
import { AppError, ERROR_CODES, isAppError, type ErrorCode } from "@/lib/errors/app-error";
import { compressPdf, isCompressionPreset } from "@/lib/server/ghostscript";
import { ConcurrencyGate, RateLimiter } from "@/lib/server/limiter";

const limiter = new RateLimiter(10, 60_000);
const gate = new ConcurrencyGate(2);

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  INVALID_FILE_TYPE: 415,
  FILE_TOO_LARGE: 413,
  EMPTY_FILE: 400,
  RATE_LIMITED: 429,
  SERVER_BUSY: 503,
  TIMEOUT: 504,
  PROCESSING_FAILED: 422,
};

function errorResponse(error: unknown): Response {
  const appError = isAppError(error)
    ? error
    : new AppError(ERROR_CODES.UNKNOWN, { cause: error });

  if (!isAppError(error) || appError.code === ERROR_CODES.UNKNOWN) {
    console.error("[compress]", error);
  } else if (appError.code === ERROR_CODES.PROCESSING_FAILED) {
    console.error("[compress]", appError.message);
  }

  return Response.json(
    { code: appError.code, message: appError.userMessage },
    { status: STATUS_BY_CODE[appError.code] ?? 500 },
  );
}

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  if (!limiter.allow(clientKey(request))) {
    return errorResponse(new AppError(ERROR_CODES.RATE_LIMITED));
  }

  // Reject oversized bodies before buffering them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LIMITS.maxFileSizeBytes + 1024 * 1024) {
    return errorResponse(
      new AppError(ERROR_CODES.FILE_TOO_LARGE, { userMessage: "This file is too large to compress." }),
    );
  }

  if (!gate.tryAcquire()) {
    return errorResponse(new AppError(ERROR_CODES.SERVER_BUSY));
  }

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const preset = form?.get("preset") ?? "recommended";

    if (!(file instanceof File) || !isCompressionPreset(preset)) {
      throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, {
        userMessage: "Upload a PDF file and choose a valid compression level.",
      });
    }
    if (file.size === 0) throw new AppError(ERROR_CODES.EMPTY_FILE);
    if (file.size > LIMITS.maxFileSizeBytes) {
      throw new AppError(ERROR_CODES.FILE_TOO_LARGE, {
        userMessage: "This file is too large to compress.",
      });
    }

    // Trust the content, not the declared MIME type.
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 1024).indexOf("%PDF-") === -1) {
      throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, {
        userMessage: "This doesn't look like a PDF file.",
      });
    }

    const result = await compressPdf(bytes, preset);

    return new Response(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-Compression-Result": result.unchanged ? "unchanged" : "reduced",
      },
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    gate.release();
  }
}
