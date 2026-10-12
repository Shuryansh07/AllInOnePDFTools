import { postPdf } from "./client";

/** Encrypt a PDF so a password is required to open it. */
export async function protectPdfRemote(
  file: File,
  password: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return (await postPdf("/api/protect", file, { password }, signal)).blob;
}

/** Remove password protection from a PDF. */
export async function unlockPdfRemote(
  file: File,
  password: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return (await postPdf("/api/unlock", file, { password }, signal)).blob;
}
