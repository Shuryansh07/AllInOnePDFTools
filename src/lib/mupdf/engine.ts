import type * as MuPdfModule from "mupdf";
import { AppError, ERROR_CODES } from "@/lib/errors/app-error";

/**
 * PDF text editing on top of MuPDF (AGPL-3.0).
 *
 * These are plain functions that receive the `mupdf` module, so the same code runs in the
 * browser worker and in Node tests. Coordinates are MuPDF "page space": points, origin at the
 * top-left, y growing downwards, with the page's /Rotate already applied.
 */

export type MuPdf = typeof MuPdfModule;
export type Doc = MuPdfModule.PDFDocument;

export type Box = [x0: number, y0: number, x1: number, y1: number];

export interface TextLine {
  text: string;
  bbox: Box;
  /** Font size in points, taken from the first character. */
  fontSize: number;
  /** Text colour as #rrggbb. */
  color: string;
  fontName: string;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface TextEdit {
  /** 0-based page index. */
  page: number;
  /** Bounding box of the line being replaced, as returned by getTextLines. */
  bbox: Box;
  newText: string;
  fontSize: number;
  color: string;
}

const hex2 = (n: number) =>
  Math.round(Math.min(Math.max(n, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");

/** MuPDF reports colour as 1 (gray), 3 (RGB) or 4 (CMYK) components in 0..1. */
export function colorToHex(color: ArrayLike<number> | undefined): string {
  if (!color || color.length === 0) return "#000000";
  if (color.length === 1) return `#${hex2(color[0]).repeat(3)}`;
  if (color.length === 3) return `#${hex2(color[0])}${hex2(color[1])}${hex2(color[2])}`;
  if (color.length === 4) {
    const [c, m, y, k] = [color[0], color[1], color[2], color[3]];
    return `#${hex2((1 - c) * (1 - k))}${hex2((1 - m) * (1 - k))}${hex2((1 - y) * (1 - k))}`;
  }
  return "#000000";
}

export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const value = parseInt(match[1], 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function openDocument(mupdf: MuPdf, bytes: Uint8Array): Doc {
  let document: MuPdfModule.Document;
  try {
    document = mupdf.Document.openDocument(bytes, "application/pdf");
  } catch (error) {
    throw new AppError(ERROR_CODES.CORRUPT_PDF, { cause: error });
  }

  if (document.needsPassword()) {
    throw new AppError(ERROR_CODES.ENCRYPTED_PDF);
  }
  const pdf = document.asPDF();
  if (!pdf) {
    throw new AppError(ERROR_CODES.CORRUPT_PDF);
  }
  return pdf;
}

export function countPages(doc: Doc): number {
  return doc.countPages();
}

export function getPageSize(doc: Doc, pageIndex: number): PageSize {
  const [x0, y0, x1, y1] = doc.loadPage(pageIndex).getBounds();
  return { width: x1 - x0, height: y1 - y0 };
}

/** One entry per line of text on the page, in reading order. */
export function getTextLines(doc: Doc, pageIndex: number): TextLine[] {
  const page = doc.loadPage(pageIndex);
  const structured = page.toStructuredText("preserve-whitespace");
  const lines: TextLine[] = [];

  let current: { text: string; bbox: Box; size: number; color: string; font: string; first: boolean } | null = null;

  structured.walk({
    beginLine(bbox) {
      current = {
        text: "",
        bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
        size: 0,
        color: "#000000",
        font: "",
        first: true,
      };
    },
    onChar(char, _origin, font, size, _quad, color) {
      if (!current) return;
      current.text += char;
      if (current.first && char.trim() !== "") {
        current.size = size;
        current.color = colorToHex(color);
        current.font = font.getName();
        current.first = false;
      }
    },
    endLine() {
      if (current && current.text.trim() !== "") {
        lines.push({
          text: current.text,
          bbox: current.bbox,
          fontSize: Math.round((current.size || 12) * 10) / 10,
          color: current.color,
          fontName: current.font,
        });
      }
      current = null;
    },
  });

  return lines;
}

/** Render a page to PNG at `scale` (1 = 72 dpi). */
export function renderPagePng(mupdf: MuPdf, doc: Doc, pageIndex: number, scale: number): Uint8Array {
  const page = doc.loadPage(pageIndex);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  return pixmap.asPNG();
}

/** Width of `text` in Helvetica at `size` points, used to widen the box for longer replacements. */
function measureHelvetica(mupdf: MuPdf, text: string, size: number): number {
  const font = new mupdf.Font("Helvetica");
  let width = 0;
  for (const char of text) {
    width += font.advanceGlyph(font.encodeCharacter(char)) * size;
  }
  return width;
}

/**
 * Replace lines of text. For each edit the original text is *removed* from the page content
 * (a redaction with no black box), then the new text is added and baked into the page, so
 * the result is ordinary page content, not an annotation.
 *
 * The replacement uses Helvetica. The original font is usually a subset that can't render
 * arbitrary new letters.
 */
export function applyTextEdits(mupdf: MuPdf, doc: Doc, edits: TextEdit[]): Uint8Array {
  if (edits.length === 0) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, { userMessage: "Choose some text to change first." });
  }

  applyTextEditsInPlace(mupdf, doc, edits);

  // asUint8Array() is a *view into WASM memory*, which is invalidated when the heap is reused or
  // grows. Copy it so callers get bytes they own (and can safely transfer between threads).
  return new Uint8Array(doc.saveToBuffer("garbage=compact,compress").asUint8Array());
}

/**
 * Apply the edits to `doc` in memory without serialising it. Used for live previews: rendering the
 * page afterwards shows what saving will produce (same pipeline; only anti-aliasing at glyph edges
 * can differ by a hair, because saving rounds coordinates).
 */
export function applyTextEditsInPlace(mupdf: MuPdf, doc: Doc, edits: TextEdit[]): void {
  const byPage = new Map<number, TextEdit[]>();
  for (const edit of edits) {
    byPage.set(edit.page, [...(byPage.get(edit.page) ?? []), edit]);
  }

  for (const [pageIndex, pageEdits] of byPage) {
    const page = doc.loadPage(pageIndex);

    // 1. Remove the original text. Shrink each box slightly so touching lines are left alone.
    for (const edit of pageEdits) {
      const [x0, y0, x1, y1] = edit.bbox;
      const inset = (y1 - y0) * 0.15;
      const redact = page.createAnnotation("Redact");
      redact.setRect([x0, y0 + inset, x1, y1 - inset]);
    }
    page.applyRedactions(
      false, // no black boxes
      mupdf.PDFPage.REDACT_IMAGE_NONE, // leave images alone
      mupdf.PDFPage.REDACT_LINE_ART_NONE, // leave drawings alone
      mupdf.PDFPage.REDACT_TEXT_REMOVE, // remove the text itself
    );

    // 2. Add the new text.
    for (const edit of pageEdits) {
      if (edit.newText.trim() === "") continue;

      const [x0, y0, x1, y1] = edit.bbox;
      const height = y1 - y0;
      const lineCount = edit.newText.split("\n").length;
      const longest = Math.max(...edit.newText.split("\n").map((line) => measureHelvetica(mupdf, line, edit.fontSize)));
      const width = Math.max(x1 - x0, longest) + edit.fontSize; // a little slack so it never wraps

      const note = page.createAnnotation("FreeText");
      note.setRect([x0, y0, x0 + width, y0 + Math.max(height, lineCount * edit.fontSize * 1.2)]);
      note.setBorderWidth(0);
      note.setDefaultAppearance("Helv", edit.fontSize, hexToRgb(edit.color));
      note.setContents(edit.newText);
      note.update();
    }
  }

  // 3. Turn the annotations into real page content.
  doc.bake(true, false);
}
