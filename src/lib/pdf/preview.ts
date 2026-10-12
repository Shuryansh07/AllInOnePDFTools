import { AppError, ERROR_CODES } from "@/lib/errors";

export interface PdfPreview {
  pageCount: number;
  /** Render a page (0-based) to a JPEG data URL no wider than `width` CSS pixels. */
  renderPage: (index: number, width: number) => Promise<string>;
  destroy: () => void;
}

/**
 * Open a PDF for thumbnail rendering with pdf.js.
 * pdf.js touches browser globals at import time, so it's loaded lazily and only on the client.
 */
export async function openPdfPreview(file: File): Promise<PdfPreview> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  let task;
  let doc;
  try {
    // pdf.js transfers the buffer to its worker, so hand it a copy.
    const data = new Uint8Array(await file.arrayBuffer());
    task = pdfjs.getDocument({ data });
    doc = await task.promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
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

  return {
    pageCount: doc.numPages,
    async renderPage(index, width) {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = (width * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
          userMessage: "Your browser couldn't render the page preview.",
        });
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
      return canvas.toDataURL("image/jpeg", 0.8);
    },
    destroy() {
      void task.destroy();
    },
  };
}
