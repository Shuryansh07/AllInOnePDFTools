"use client";

import { useState } from "react";
import { Loader2, Merge } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME } from "@/config/limits";
import { useFileList } from "@/hooks/use-file-list";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { mergePdfs } from "@/lib/pdf/merge";
import type { ToolState } from "@/types/tool";

const OUTPUT_NAME = "merged.pdf";
const ACCEPT = ACCEPTED_MIME.pdf;

interface Result {
  blob: Blob;
}

export function MergePdfWorkspace() {
  const { items, addFiles, remove, move, clear } = useFileList({ accept: ACCEPT });
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const hasFiles = items.length > 0;
  const processing = state === "processing";

  const handleMerge = async () => {
    setState("processing");
    try {
      const bytes = await mergePdfs(items.map((item) => item.file));
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      setResult({ blob });
      setState("done");
    } catch (error) {
      const appError = handleError(error);
      setErrorMessage(appError.userMessage);
      setState("error");
    }
  };

  const reset = () => {
    clear();
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  if (state === "done" && result) {
    return (
      <ResultPanel
        filename={OUTPUT_NAME}
        sizeBytes={result.blob.size}
        onDownload={() => downloadBlob(result.blob, OUTPUT_NAME)}
        onReset={reset}
      />
    );
  }

  if (state === "error") {
    return <ErrorPanel message={errorMessage} onRetry={() => setState("idle")} />;
  }

  return (
    <div className="space-y-4">
      <Dropzone
        accept={ACCEPT.join(",")}
        onFiles={addFiles}
        disabled={processing}
        label={hasFiles ? "Add more PDF files" : "Select PDF files"}
      />

      {hasFiles && (
        <>
          <FileList items={items} onRemove={remove} onMove={move} disabled={processing} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {items.length < 2
                ? "Add at least one more file to merge."
                : "Files are merged in the order shown."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear} disabled={processing}>
                Clear
              </Button>
              <Button onClick={handleMerge} disabled={processing || items.length < 2}>
                {processing ? <Loader2 className="animate-spin" /> : <Merge />}
                {processing ? "Merging…" : "Merge PDF"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
