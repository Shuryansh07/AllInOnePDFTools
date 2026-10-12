import { AppError, ERROR_CODES } from "@/lib/errors";

function invalid(userMessage: string): AppError {
  return new AppError(ERROR_CODES.INVALID_PAGE_RANGE, { userMessage });
}

/**
 * Parse a string like "1-3, 5, 8-10" into 1-based page numbers, in the order given.
 * Throws AppError(INVALID_PAGE_RANGE) with a message explaining what's wrong.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) throw invalid("Enter the pages you want to extract, for example 1-3, 5.");

  const pages: number[] = [];

  for (const rawToken of trimmed.split(",")) {
    const token = rawToken.trim();
    if (!token) continue;

    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) throw invalid(`"${token}" isn't a valid page or range.`);

    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);

    if (start < 1 || end < 1) throw invalid("Page numbers start at 1.");
    if (start > end) throw invalid(`"${token}" is backwards. Use ${end}-${start}.`);
    if (end > pageCount) {
      throw invalid(
        `Page ${end} doesn't exist. This document has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`,
      );
    }

    for (let page = start; page <= end; page++) pages.push(page);
  }

  if (pages.length === 0) throw invalid("Enter the pages you want to extract, for example 1-3, 5.");
  return pages;
}
