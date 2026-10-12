import { PDFDocument } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { loadPdf } from "./load";

/**
 * Merge PDFs in the given order into one document.
 * Runs entirely in the browser; throws AppError with a file-specific message.
 */
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) {
    throw new AppError(ERROR_CODES.TOO_FEW_FILES, {
      userMessage: "Add at least two PDF files to merge.",
    });
  }

  const merged = await PDFDocument.create();

  for (const file of files) {
    const source = await loadPdf(file);

    try {
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } catch (error) {
      throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
        userMessage: `Couldn't add pages from "${file.name}".`,
        cause: error,
      });
    }
  }

  return merged.save();
}
