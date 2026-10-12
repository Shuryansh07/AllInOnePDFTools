import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/errors/app-error";

export type CompressionLevel = "low" | "recommended" | "extreme";

export interface CompressOutcome {
  blob: Blob;
  /** True when the server couldn't make the file smaller and returned it as-is. */
  unchanged: boolean;
}

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

/** Upload a PDF to the compression endpoint. Throws AppError with a user-friendly message. */
export async function compressPdfRemote(
  file: File,
  level: CompressionLevel,
  signal?: AbortSignal,
): Promise<CompressOutcome> {
  const body = new FormData();
  body.append("file", file);
  body.append("preset", level);

  let response: Response;
  try {
    response = await fetch("/api/compress", { method: "POST", body, signal });
  } catch (error) {
    throw new AppError(ERROR_CODES.NETWORK_ERROR, { cause: error });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    const code = (payload?.code && KNOWN_CODES.has(payload.code)
      ? payload.code
      : ERROR_CODES.PROCESSING_FAILED) as ErrorCode;
    throw new AppError(code, { userMessage: payload?.message });
  }

  return {
    blob: await response.blob(),
    unchanged: response.headers.get("X-Compression-Result") === "unchanged",
  };
}
