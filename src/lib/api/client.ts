import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/errors/app-error";

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

export interface PdfResponse {
  blob: Blob;
  headers: Headers;
}

/**
 * POST a PDF (plus text fields) to one of our API routes.
 * Throws AppError carrying the server's user-facing message.
 */
export async function postPdf(
  endpoint: string,
  file: File,
  fields: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<PdfResponse> {
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AppError(ERROR_CODES.NETWORK_ERROR, { cause: error });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    const code = (
      payload?.code && KNOWN_CODES.has(payload.code) ? payload.code : ERROR_CODES.PROCESSING_FAILED
    ) as ErrorCode;
    throw new AppError(code, { userMessage: payload?.message });
  }

  return { blob: await response.blob(), headers: response.headers };
}
