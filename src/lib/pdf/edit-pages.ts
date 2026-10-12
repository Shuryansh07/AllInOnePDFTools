import { degrees } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { loadPdf } from "./load";

/**
 * Rotate pages. `deltas[i]` is the clockwise rotation (multiple of 90) to add to page i.
 */
export async function rotatePages(file: File, deltas: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(file);

  if (deltas.length !== doc.getPageCount()) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED);
  }
  if (deltas.every((delta) => delta % 360 === 0)) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: "Rotate at least one page first.",
    });
  }

  doc.getPages().forEach((page, index) => {
    const next = (((page.getRotation().angle + deltas[index]) % 360) + 360) % 360;
    page.setRotation(degrees(next));
  });

  return doc.save();
}

/** Remove the given 0-based page indices. */
export async function deletePages(file: File, indices: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const unique = [...new Set(indices)].filter((index) => index >= 0 && index < total);

  if (unique.length === 0) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: "Select at least one page to delete.",
    });
  }
  if (unique.length >= total) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: "You can't delete every page. Keep at least one.",
    });
  }

  // Remove from the end so earlier indices stay valid.
  unique.sort((a, b) => b - a).forEach((index) => doc.removePage(index));
  return doc.save();
}
