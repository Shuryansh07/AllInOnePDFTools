"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { deletePages } from "@/lib/pdf/edit-pages";
import type { ToolState } from "@/types/tool";

interface Result {
  blob: Blob;
  filename: string;
}

export function DeletePagesWorkspace() {
  const { file, pageCount, loading, select, reset: resetFile } = useSinglePdf();
  const thumbs = usePdfThumbnails(file, pageCount);

  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const processing = state === "processing";
  const busy = processing || loading;
  const allMarked = pageCount > 0 && marked.size >= pageCount;

  const toggle = (index: number) =>
    setMarked((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  const resetAll = () => {
    resetFile();
    setMarked(new Set());
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleApply = async () => {
    if (!file) return;
    setState("processing");
    try {
      const bytes = await deletePages(file, [...marked]);
      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        filename: `${file.name.replace(/\.pdf$/i, "")}_edited.pdf`,
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
        {pageCount} {pageCount === 1 ? "page" : "pages"}. Click a page to mark it for deletion.
      </p>

      <PageGrid thumbs={thumbs} dimmed={marked} onPageClick={busy ? undefined : toggle} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {allMarked
            ? "You can't delete every page. Keep at least one."
            : `${marked.size} ${marked.size === 1 ? "page" : "pages"} selected`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy || marked.size === 0} onClick={() => setMarked(new Set())}>
            Clear selection
          </Button>
          <Button variant="destructive" disabled={busy || marked.size === 0 || allMarked} onClick={handleApply}>
            {processing ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {processing ? "Deleting…" : "Delete pages"}
          </Button>
        </div>
      </div>
    </div>
  );
}
