import { postPdf } from "./client";

export type CompressionLevel = "low" | "recommended" | "extreme";

export interface CompressOutcome {
  blob: Blob;
  /** True when the server couldn't make the file smaller and returned it as-is. */
  unchanged: boolean;
}

/** Upload a PDF to the compression endpoint. Throws AppError with a user-friendly message. */
export async function compressPdfRemote(
  file: File,
  level: CompressionLevel,
  signal?: AbortSignal,
): Promise<CompressOutcome> {
  const { blob, headers } = await postPdf("/api/compress", file, { preset: level }, signal);
  return { blob, unchanged: headers.get("X-Compression-Result") === "unchanged" };
}
