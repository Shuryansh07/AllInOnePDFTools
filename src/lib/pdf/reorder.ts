import { PDFDocument } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { loadPdf } from "./load";

/**
 * Rebuild the document with pages in a new order.
 * `order[i]` is the 0-based index of the original page that ends up at position i.
 */
export async function reorderPages(file: File, order: number[]): Promise<Uint8Array> {
  const source = await loadPdf(file);
  const total = source.getPageCount();

  const isPermutation =
    order.length === total &&
    new Set(order).size === total &&
    order.every((index) => Number.isInteger(index) && index >= 0 && index < total);
  if (!isPermutation) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED);
  }
  if (order.every((index, position) => index === position)) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: "Move at least one page first.",
    });
  }

  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, order);
  pages.forEach((page) => out.addPage(page));
  return out.save();
}
