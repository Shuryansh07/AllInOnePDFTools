import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/errors/app-error";
import type { PageSize, TextEdit, TextLine } from "./engine";
import type { OpenResult, WorkerRequest, WorkerResponse } from "./worker";

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

/** Distributes over the union so `Omit` keeps each variant's own fields. */
type RequestBody = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

/**
 * Talks to the MuPDF worker. The worker (and its ~10 MB WASM) is only created when
 * the first call is made, so pages that never use it don't pay for it.
 */
export class MuPdfClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const entry = this.pending.get(response.id);
      if (!entry) return;
      this.pending.delete(response.id);

      if (response.ok) {
        entry.resolve(response.result);
      } else {
        const code = (KNOWN_CODES.has(response.error.code) ? response.error.code : ERROR_CODES.PROCESSING_FAILED) as ErrorCode;
        entry.reject(new AppError(code, { userMessage: response.error.message }));
      }
    };

    worker.onerror = (event) => {
      const error = new AppError(ERROR_CODES.PROCESSING_FAILED, {
        userMessage: "The text editor engine failed to load. Please refresh and try again.",
        message: event.message,
      });
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
    };

    this.worker = worker;
    return worker;
  }

  private call<T>(body: RequestBody): Promise<T> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      worker.postMessage({ id, ...body } as WorkerRequest);
    });
  }

  open(bytes: Uint8Array): Promise<{ pageCount: number; pages: PageSize[] }> {
    return this.call<OpenResult>({ type: "open", bytes });
  }

  getLines(page: number): Promise<TextLine[]> {
    return this.call<TextLine[]>({ type: "lines", page });
  }

  /** PNG bytes of the page at `scale` (1 = 72 dpi). */
  render(page: number, scale: number): Promise<Uint8Array> {
    return this.call<Uint8Array>({ type: "render", page, scale });
  }

  /** PNG of `page` with `edits` applied, as saving would produce it. Nothing is persisted. */
  preview(page: number, scale: number, edits: TextEdit[]): Promise<Uint8Array> {
    return this.call<Uint8Array>({ type: "preview", page, scale, edits });
  }

  apply(edits: TextEdit[]): Promise<Uint8Array> {
    return this.call<Uint8Array>({ type: "apply", edits });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    const error = new AppError(ERROR_CODES.PROCESSING_FAILED, { userMessage: "The editor was closed." });
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }
}
