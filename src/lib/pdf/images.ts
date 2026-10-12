import { PDFDocument } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";

export type PageSize = "fit" | "a4" | "letter";
export type PageMargin = "none" | "small" | "large";

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  margin: PageMargin;
}

const PAGE_DIMENSIONS = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

const MARGIN_POINTS: Record<PageMargin, number> = { none: 0, small: 24, large: 48 };

/** CSS pixels (96 dpi) to PDF points (72 dpi), used when the page fits the image. */
const PX_TO_PT = 0.75;

/**
 * Re-encode a JPEG through a canvas so EXIF orientation is baked in.
 * pdf-lib ignores EXIF, so phone photos would otherwise come out sideways.
 * Browser-only.
 */
async function normalizeJpeg(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) throw new Error("Canvas export failed");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

/** Build a PDF with one image per page, in the given order. */
export async function imagesToPdf(
  files: File[],
  { pageSize, margin }: ImagesToPdfOptions,
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new AppError(ERROR_CODES.TOO_FEW_FILES, {
      userMessage: "Add at least one image to convert.",
    });
  }

  const pdf = await PDFDocument.create();

  for (const file of files) {
    let image;
    try {
      if (file.type === "image/png") {
        image = await pdf.embedPng(await file.arrayBuffer());
      } else {
        image = await pdf.embedJpg(await normalizeJpeg(file));
      }
    } catch (error) {
      throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
        userMessage: `"${file.name}" couldn't be read as an image. It may be damaged.`,
        cause: error,
      });
    }

    if (pageSize === "fit") {
      const width = image.width * PX_TO_PT;
      const height = image.height * PX_TO_PT;
      const page = pdf.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
      continue;
    }

    // Fixed page: orient the page to the image, then scale the image to fit inside the margins.
    const base = PAGE_DIMENSIONS[pageSize];
    const landscape = image.width > image.height;
    const pageWidth = landscape ? base.height : base.width;
    const pageHeight = landscape ? base.width : base.height;

    const inset = MARGIN_POINTS[margin];
    const availableWidth = pageWidth - inset * 2;
    const availableHeight = pageHeight - inset * 2;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;

    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }

  return pdf.save();
}
