"use client";

import { useState } from "react";
import { Loader2, RotateCcw, RotateCw } from "lucide-react";
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
import { rotatePages } from "@/lib/pdf/edit-pages";
import type { ToolState } from "@/types/tool";

interface Result {
  blob: Blob;
  filename: string;
}

export function RotatePdfWorkspace() {
  const { file, pageCount, loading, select, reset: resetFile } = useSinglePdf();
  const thumbs = usePdfThumbnails(file, pageCount);

  // Sparse map of page index -> accumulated clockwise rotation (degrees).
  const [rotationMap, setRotationMap] = useState<Record<number, number>>({});
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const processing = state === "processing";
  const busy = processing || loading;

  const rotations = Array.from({ length: pageCount }, (_, index) => rotationMap[index] ?? 0);
  const changed = rotations.some((value) => value % 360 !== 0);

  const rotateOne = (index: number, delta: number) =>
    setRotationMap((current) => ({ ...current, [index]: (current[index] ?? 0) + delta }));

  const rotateAll = (delta: number) =>
    setRotationMap(Object.fromEntries(rotations.map((value, index) => [index, value + delta])));

  const resetAll = () => {
    resetFile();
    setRotationMap({});
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleApply = async () => {
    if (!file) return;
    setState("processing");
    try {
      const bytes = await rotatePages(file, rotations);
      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        filename: `${file.name.replace(/\.pdf$/i, "")}_rotated.pdf`,
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pageCount} {pageCount === 1 ? "page" : "pages"}. Rotate individual pages, or all at once.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => rotateAll(-90)}>
            <RotateCcw /> All left
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => rotateAll(90)}>
            <RotateCw /> All right
          </Button>
        </div>
      </div>

      <PageGrid
        thumbs={thumbs}
        rotations={rotations}
        renderActions={(index) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rotate page ${index + 1} left`}
              disabled={busy}
              onClick={() => rotateOne(index, -90)}
            >
              <RotateCcw />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rotate page ${index + 1} right`}
              disabled={busy}
              onClick={() => rotateOne(index, 90)}
            >
              <RotateCw />
            </Button>
          </div>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy || !changed} onClick={() => setRotationMap({})}>
          Reset
        </Button>
        <Button disabled={busy || !changed} onClick={handleApply}>
          {processing && <Loader2 className="animate-spin" />}
          {processing ? "Saving…" : "Apply rotation"}
        </Button>
      </div>
    </div>
  );
}
