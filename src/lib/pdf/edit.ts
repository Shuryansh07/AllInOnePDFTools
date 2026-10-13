import { PDFPage, StandardFonts, degrees, rgb } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { loadPdf } from "./load";

/**
 * Elements are positioned in *display space*: (u, v) are fractions of the page as the user
 * sees it (0,0 = top-left, 1,1 = bottom-right), so they're independent of zoom and of the
 * page's /Rotate. They're converted to PDF user space only at export.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface PageGeometry {
  /** Visible area (CropBox) in unrotated PDF user space. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The page's own /Rotate, clockwise. */
  rotation: Rotation;
}

interface BaseElement {
  id: string;
  /** 0-based page index. */
  page: number;
  /** Top-left corner, as fractions of the displayed page. */
  u: number;
  v: number;
}

export interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  /** Font size in PDF points. */
  fontSize: number;
  color: string;
}

export interface RectElement extends BaseElement {
  kind: "rect";
  /** Size as fractions of the displayed page. */
  w: number;
  h: number;
  color: string;
  opacity: number;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  w: number;
  h: number;
  bytes: Uint8Array;
  mime: "image/png" | "image/jpeg";
  naturalWidth: number;
  naturalHeight: number;
  /** Object URL for on-screen preview only; not used by the export. */
  previewUrl?: string;
}

export type EditElement = TextElement | RectElement | ImageElement;

/** Line box used for text, on screen and in the export. Keep in sync with the editor's CSS. */
export const TEXT_LINE_HEIGHT = 1.2;
/** Distance from the top of a line box to its baseline, as a fraction of the font size (Helvetica/Arial). */
export const TEXT_BASELINE = 0.95;

export function normalizeRotation(angle: number): Rotation {
  const normalized = ((Math.round(angle) % 360) + 360) % 360;
  return (normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0) as Rotation;
}

/** Size of the page as displayed (width and height swap for 90/270). */
export function displaySize(geometry: PageGeometry): { width: number; height: number } {
  const swapped = geometry.rotation === 90 || geometry.rotation === 270;
  return swapped
    ? { width: geometry.height, height: geometry.width }
    : { width: geometry.width, height: geometry.height };
}

/** Convert a point in display space (fractions, top-left origin) to PDF user space. */
export function displayToPdf(u: number, v: number, geometry: PageGeometry): { x: number; y: number } {
  const { x: ox, y: oy, width: w, height: h, rotation } = geometry;

  switch (rotation) {
    case 90:
      return { x: ox + v * w, y: oy + u * h };
    case 180:
      return { x: ox + (1 - u) * w, y: oy + v * h };
    case 270:
      return { x: ox + (1 - v) * w, y: oy + (1 - u) * h };
    default:
      return { x: ox + u * w, y: oy + (1 - v) * h };
  }
}

export function getPageGeometry(page: PDFPage): PageGeometry {
  const box = page.getCropBox();
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: normalizeRotation(page.getRotation().angle),
  };
}

function toRgb(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return rgb(0, 0, 0);
  const value = parseInt(match[1], 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

/** Burn the elements into a copy of the PDF. */
export async function applyEdits(file: File, elements: EditElement[]): Promise<Uint8Array> {
  if (elements.length === 0) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: "Add some text, an image or a shape first.",
    });
  }

  const doc = await loadPdf(file);
  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const element of elements) {
    const page = pages[element.page];
    if (!page) continue;

    const geometry = getPageGeometry(page);
    const display = displaySize(geometry);
    // Drawing is rotated with the page so elements appear upright on screen.
    const rotate = degrees(geometry.rotation);

    try {
      if (element.kind === "rect") {
        const corner = displayToPdf(element.u, element.v + element.h, geometry);
        page.drawRectangle({
          x: corner.x,
          y: corner.y,
          width: element.w * display.width,
          height: element.h * display.height,
          color: toRgb(element.color),
          opacity: element.opacity,
          rotate,
        });
      } else if (element.kind === "image") {
        const embedded =
          element.mime === "image/png"
            ? await doc.embedPng(element.bytes)
            : await doc.embedJpg(element.bytes);
        const corner = displayToPdf(element.u, element.v + element.h, geometry);
        page.drawImage(embedded, {
          x: corner.x,
          y: corner.y,
          width: element.w * display.width,
          height: element.h * display.height,
          rotate,
        });
      } else {
        const color = toRgb(element.color);
        element.text.split("\n").forEach((line, index) => {
          if (line.length === 0) return;
          const baselineV =
            element.v + ((TEXT_BASELINE + index * TEXT_LINE_HEIGHT) * element.fontSize) / display.height;
          const origin = displayToPdf(element.u, baselineV, geometry);
          page.drawText(line, {
            x: origin.x,
            y: origin.y,
            size: element.fontSize,
            font,
            color,
            rotate,
          });
        });
      }
    } catch (error) {
      const isText = element.kind === "text";
      throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
        userMessage: isText
          ? `Page ${element.page + 1}: this text contains characters that can't be added. Use letters, numbers and common punctuation.`
          : `Page ${element.page + 1}: couldn't add the ${element.kind === "image" ? "image" : "shape"}.`,
        cause: error,
      });
    }
  }

  return doc.save();
}
