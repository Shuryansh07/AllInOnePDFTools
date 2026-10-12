import { zipSync } from "fflate";

/** Bundle files into a ZIP. PDFs are already compressed, so store them as-is (level 0). */
export function createZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const { name, bytes } of files) entries[name] = bytes;
  return zipSync(entries, { level: 0 });
}
