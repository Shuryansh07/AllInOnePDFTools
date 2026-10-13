/// <reference lib="webworker" />
import type * as MuPdfModule from "mupdf";
import { AppError, ERROR_CODES, isAppError } from "@/lib/errors/app-error";
import {
  applyTextEdits,
  applyTextEditsInPlace,
  countPages,
  getPageSize,
  getTextLines,
  openDocument,
  renderPagePng,
  type Doc,
  type PageSize,
  type TextEdit,
  type TextLine,
} from "./engine";

/**
 * Hosts MuPDF off the main thread (its WASM is ~10 MB and rendering is CPU heavy).
 * Messages are request/response pairs matched by `id`.
 */

export type WorkerRequest = { id: number } & (
  | { type: "open"; bytes: Uint8Array }
  | { type: "lines"; page: number }
  | { type: "render"; page: number; scale: number }
  | { type: "apply"; edits: TextEdit[] }
  | { type: "preview"; page: number; scale: number; edits: TextEdit[] }
);

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: { code: string; message: string } };

export interface OpenResult {
  pageCount: number;
  pages: PageSize[];
}

let original: Uint8Array | null = null;
let doc: Doc | null = null;

/**
 * MuPDF's loader uses top-level `await` (it compiles ~10 MB of WASM). A module worker that
 * imports it statically only starts listening for messages AFTER that finishes, so anything
 * posted at startup would be silently dropped. Importing lazily lets us attach `onmessage`
 * immediately and have early requests wait for the engine instead.
 */
let engine: Promise<typeof MuPdfModule> | null = null;
const loadMuPdf = () => (engine ??= import("mupdf"));

function requireDoc(): Doc {
  if (!doc) throw new AppError(ERROR_CODES.PROCESSING_FAILED, { userMessage: "No document is open." });
  return doc;
}

function handle(mupdf: typeof MuPdfModule, request: WorkerRequest): { result: unknown; transfer?: Transferable[] } {
  switch (request.type) {
    case "open": {
      doc?.destroy();
      original = request.bytes;
      doc = openDocument(mupdf, request.bytes);
      const pageCount = countPages(doc);
      const pages = Array.from({ length: pageCount }, (_, index) => getPageSize(doc!, index));
      return { result: { pageCount, pages } satisfies OpenResult };
    }

    case "lines":
      return { result: getTextLines(requireDoc(), request.page) satisfies TextLine[] };

    case "render": {
      const png = renderPagePng(mupdf, requireDoc(), request.page, request.scale);
      return { result: png, transfer: [png.buffer as ArrayBuffer] };
    }

    case "preview": {
      requireDoc();
      // Apply to a throwaway copy and render it, so the document on screen stays pristine.
      const copy = openDocument(mupdf, original!);
      try {
        applyTextEditsInPlace(mupdf, copy, request.edits);
        const png = renderPagePng(mupdf, copy, request.page, request.scale);
        return { result: png, transfer: [png.buffer as ArrayBuffer] };
      } finally {
        copy.destroy();
      }
    }

    case "apply": {
      requireDoc();
      // Edit a fresh copy so the open document (and what's on screen) stays pristine.
      const copy = openDocument(mupdf, original!);
      try {
        const bytes = applyTextEdits(mupdf, copy, request.edits);
        return { result: bytes, transfer: [bytes.buffer as ArrayBuffer] };
      } finally {
        copy.destroy();
      }
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    const mupdf = await loadMuPdf();
    const { result, transfer } = handle(mupdf, request);
    const response: WorkerResponse = { id: request.id, ok: true, result };
    self.postMessage(response, transfer ?? []);
  } catch (error) {
    const appError = isAppError(error) ? error : new AppError(ERROR_CODES.PROCESSING_FAILED, { cause: error });
    const response: WorkerResponse = {
      id: request.id,
      ok: false,
      error: { code: appError.code, message: appError.userMessage },
    };
    self.postMessage(response);
  }
};
