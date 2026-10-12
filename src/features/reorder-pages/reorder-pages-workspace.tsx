"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { PageGrid } from "@/components/tools/page-grid";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME } from "@/config/limits";
import { usePdfThumbnails } from "@/hooks/use-pdf-thumbnails";
import { useSinglePdf } from "@/hooks/use-single-pdf";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { reorderPages } from "@/lib/pdf/reorder";
import type { ToolState } from "@/types/tool";

interface Result {
  blob: Blob;
  filename: string;
}

function moved(order: number[], from: number, to: number): number[] {
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ReorderPagesWorkspace() {
  const { file, pageCount, loading, select, reset: resetFile } = useSinglePdf();
  const thumbs = usePdfThumbnails(file, pageCount);

  // order[position] = original 0-based page index. Empty means "unchanged".
  const [customOrder, setCustomOrder] = useState<number[] | null>(null);
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const processing = state === "processing";
  const busy = processing || loading;

  const order =
    customOrder && customOrder.length === pageCount
      ? customOrder
      : Array.from({ length: pageCount }, (_, index) => index);
  const changed = order.some((original, position) => original !== position);
  const orderedThumbs = order.map((original) => thumbs[original] ?? null);

  const move = (from: number, to: number) => {
    if (busy || to < 0 || to >= pageCount) return;
    setCustomOrder(moved(order, from, to));
  };

  const resetAll = () => {
    resetFile();
    setCustomOrder(null);
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleApply = async () => {
    if (!file) return;
    setState("processing");
    try {
      const bytes = await reorderPages(file, order);
      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        filename: `${file.name.replace(/\.pdf$/i, "")}_reordered.pdf`,
      });
      setState("done");
    } catch (error) {
      const appError = handleError(error);
      setErrorMessage(appError.userMessage);
      setState("error");
    }
  };

  if (state === "done" && result) {
    return (
      <ResultPanel
        filename={result.filename}
        sizeBytes={result.blob.size}
        onDownload={() => downloadBlob(result.blob, result.filename)}
        onReset={resetAll}
      />
    );
  }

  if (state === "error") {
    return <ErrorPanel message={errorMessage} onRetry={() => setState("idle")} />;
  }

  if (!file) {
    return (
      <Dropzone
        accept={ACCEPTED_MIME.pdf.join(",")}
        multiple={false}
        disabled={busy}
        label={loading ? "Reading your PDF…" : "Select a PDF file"}
        hint="or drag and drop it here"
        onFiles={select}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FileList items={[{ id: file.name, file }]} onRemove={resetAll} disabled={busy} />

      <p className="text-sm text-muted-foreground">
        {pageCount} {pageCount === 1 ? "page" : "pages"}. Drag pages to reorder them, or use the arrows. The
        number under each page is its original page number.
      </p>

      <PageGrid
        thumbs={orderedThumbs}
        labels={order}
        onReorder={busy ? undefined : move}
        renderActions={(position) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move page ${order[position] + 1} earlier`}
              disabled={busy || position === 0}
              onClick={() => move(position, position - 1)}
            >
              <ArrowLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move page ${order[position] + 1} later`}
              disabled={busy || position === pageCount - 1}
              onClick={() => move(position, position + 1)}
            >
              <ArrowRight />
            </Button>
          </div>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy || !changed} onClick={() => setCustomOrder(null)}>
          Reset order
        </Button>
        <Button disabled={busy || !changed} onClick={handleApply}>
          {processing && <Loader2 className="animate-spin" />}
          {processing ? "Saving…" : "Save new order"}
        </Button>
      </div>
    </div>
  );
}
