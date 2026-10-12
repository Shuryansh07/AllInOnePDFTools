"use client";

import { useRef, useState } from "react";
import { Loader2, Shrink } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME } from "@/config/limits";
import { useSinglePdf } from "@/hooks/use-single-pdf";
import { compressPdfRemote, type CompressionLevel } from "@/lib/api/compress";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ToolState } from "@/types/tool";

const LEVELS: { value: CompressionLevel; title: string; description: string }[] = [
  { value: "low", title: "Less compression", description: "Best quality, bigger file" },
  { value: "recommended", title: "Recommended", description: "Good quality, good size" },
  { value: "extreme", title: "Extreme", description: "Smallest file, lower quality" },
];

interface Result {
  blob: Blob;
  filename: string;
  detail: string;
}

export function CompressPdfWorkspace() {
  const { file, loading, select, reset: resetFile } = useSinglePdf();
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const processing = state === "processing";
  const busy = processing || loading;

  const resetAll = () => {
    abortRef.current?.abort();
    resetFile();
    setLevel("recommended");
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleCompress = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("processing");

    try {
      const outcome = await compressPdfRemote(file, level, controller.signal);
      const base = file.name.replace(/\.pdf$/i, "");

      const detail = outcome.unchanged
        ? "This file is already well optimised. We couldn't make it smaller, so it's unchanged."
        : `${formatBytes(file.size)} → ${formatBytes(outcome.blob.size)} (${Math.round(
            (1 - outcome.blob.size / file.size) * 100,
          )}% smaller)`;

      setResult({
        blob: outcome.blob,
        filename: outcome.unchanged ? file.name : `${base}_compressed.pdf`,
        detail,
      });
      setState("done");
    } catch (error) {
      if (controller.signal.aborted) return;
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
        detail={result.detail}
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

      <fieldset className="space-y-2" disabled={busy}>
        <legend className="text-sm font-medium">Compression level</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-xl border p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                level === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                busy && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="compression-level"
                value={option.value}
                checked={level === option.value}
                onChange={() => setLevel(option.value)}
                className="sr-only"
              />
              <span className="block font-medium">{option.title}</span>
              <span className="block text-sm text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Your file is uploaded to our server for compression and deleted immediately afterwards.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={resetAll} disabled={processing}>
          Clear
        </Button>
        <Button onClick={handleCompress} disabled={busy}>
          {processing ? <Loader2 className="animate-spin" /> : <Shrink />}
          {processing ? "Compressing…" : "Compress PDF"}
        </Button>
      </div>
    </div>
  );
}
