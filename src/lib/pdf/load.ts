import { EncryptedPDFError, PDFDocument } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";

/** Load a PDF, translating parser failures into AppErrors that name the file. */
export async function loadPdf(file: File): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new AppError(ERROR_CODES.ENCRYPTED_PDF, {
        userMessage: `"${file.name}" is password protected. Unlock it and try again.`,
        cause: error,
      });
    }
    throw new AppError(ERROR_CODES.CORRUPT_PDF, {
      userMessage: `"${file.name}" couldn't be read. It may be damaged.`,
      cause: error,
    });
  }
}
