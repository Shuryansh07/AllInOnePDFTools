import { PDFDocument } from "pdf-lib";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { parsePageRanges } from "./page-ranges";

export type SplitMode =
  | { type: "range"; ranges: string }
  | { type: "every-page" }
  | { type: "chunks"; size: number };

export interface SplitOutput {
  name: string;
  bytes: Uint8Array;
}

/** Copy the given 1-based pages (in order) into a new document. */
async function extractPages(source: PDFDocument, pages: number[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    source,
    pages.map((page) => page - 1),
  );
  copied.forEach((page) => out.addPage(page));
  return out.save();
}

function pageGroups(pageCount: number, size: number): number[][] {
  const groups: number[][] = [];
  for (let start = 1; start <= pageCount; start += size) {
    const group: number[] = [];
    for (let page = start; page < start + size && page <= pageCount; page++) group.push(page);
    groups.push(group);
  }
  return groups;
}

/**
 * Split an already-loaded PDF according to the chosen mode.
 * `baseName` is the original filename without extension.
 */
export async function splitPdf(
  source: PDFDocument,
  baseName: string,
  mode: SplitMode,
): Promise<SplitOutput[]> {
  const pageCount = source.getPageCount();

  try {
    switch (mode.type) {
      case "range": {
        const pages = parsePageRanges(mode.ranges, pageCount);
        return [{ name: `${baseName}_extracted.pdf`, bytes: await extractPages(source, pages) }];
      }

      case "every-page": {
        if (pageCount < 2) {
          throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
            userMessage: "This document only has one page, so there's nothing to split.",
          });
        }
        const outputs: SplitOutput[] = [];
        for (let page = 1; page <= pageCount; page++) {
          outputs.push({
            name: `${baseName}_page-${page}.pdf`,
            bytes: await extractPages(source, [page]),
          });
        }
        return outputs;
      }

      case "chunks": {
        const size = Math.floor(mode.size);
        if (!Number.isFinite(size) || size < 1) {
          throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
            userMessage: "Pages per file must be at least 1.",
          });
        }
        if (size >= pageCount) {
          throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
            userMessage: `This document has ${pageCount} pages. Choose fewer than ${pageCount} pages per file.`,
          });
        }
        const outputs: SplitOutput[] = [];
        for (const [index, group] of pageGroups(pageCount, size).entries()) {
          outputs.push({
            name: `${baseName}_part-${index + 1}.pdf`,
            bytes: await extractPages(source, group),
          });
        }
        return outputs;
      }
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, { cause: error });
  }
}
