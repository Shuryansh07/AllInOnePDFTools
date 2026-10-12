"use client";

import { useState } from "react";
import type { PDFDocument } from "pdf-lib";
import { Loader2, Scissors } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACCEPTED_MIME } from "@/config/limits";
import { useFileList } from "@/hooks/use-file-list";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { loadPdf } from "@/lib/pdf/load";
import { splitPdf, type SplitMode } from "@/lib/pdf/split";
import { validateFile } from "@/lib/validation/files";
import { createZip } from "@/lib/zip";
import type { ToolState } from "@/types/tool";

const ACCEPT = ACCEPTED_MIME.pdf;

type ModeType = SplitMode["type"];

interface Result {
  blob: Blob;
  filename: string;
}

export function SplitPdfWorkspace() {
  const { items, addFiles, clear } = useFileList({ accept: ACCEPT, maxFiles: 1 });
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [modeType, setModeType] = useState<ModeType>("range");
  const [ranges, setRanges] = useState("");
  const [chunkSize, setChunkSize] = useState("1");

  const current = items[0];
  const processing = state === "processing";
  const busy = processing || loading;

  const resetAll = () => {
    clear();
    setDoc(null);
    setResult(null);
    setErrorMessage("");
    setRanges("");
    setChunkSize("1");
    setModeType("range");
    setState("idle");
  };

  /** Replace the current file; parse it up front so we know the page count and fail early. */
  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    try {
      validateFile(file, { accept: ACCEPT });
      const loaded = await loadPdf(file);
      addFiles([file]);
      setDoc(loaded);
      setState("ready");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSplit = async () => {
    if (!current || !doc) return;

    const mode: SplitMode =
      modeType === "range"
        ? { type: "range", ranges }
        : modeType === "every-page"
          ? { type: "every-page" }
          : { type: "chunks", size: Number(chunkSize) };

    setState("processing");
    try {
      const baseName = current.file.name.replace(/\.pdf$/i, "");
      const outputs = await splitPdf(doc, baseName, mode);

      if (outputs.length === 1) {
        const [only] = outputs;
        setResult({
          blob: new Blob([only.bytes as BlobPart], { type: "application/pdf" }),
          filename: only.name,
        });
      } else {
        setResult({
          blob: new Blob([createZip(outputs) as BlobPart], { type: "application/zip" }),
          filename: `${baseName}_split.zip`,
        });
      }
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
    return <ErrorPanel message={errorMessage} onRetry={() => setState("ready")} />;
  }

  const pageCount = doc?.getPageCount() ?? 0;

  return (
    <div className="space-y-4">
      {!current && (
        <Dropzone
          accept={ACCEPT.join(",")}
          multiple={false}
          disabled={busy}
          label={loading ? "Reading your PDF…" : "Select a PDF file"}
          hint="or drag and drop it here"
          onFiles={handleFiles}
        />
      )}

      {current && doc && (
        <>
          <FileList items={items} onRemove={resetAll} disabled={busy} />
          <p className="text-sm text-muted-foreground">
            This document has {pageCount} {pageCount === 1 ? "page" : "pages"}.
          </p>

          <Tabs value={modeType} onValueChange={(value) => setModeType(value as ModeType)}>
            <TabsList>
              <TabsTrigger value="range">Extract pages</TabsTrigger>
              <TabsTrigger value="every-page">Every page</TabsTrigger>
              <TabsTrigger value="chunks">Fixed size</TabsTrigger>
            </TabsList>

            <TabsContent value="range" className="space-y-2 pt-2">
              <Label htmlFor="ranges">Pages to extract</Label>
              <Input
                id="ranges"
                placeholder="e.g. 1-3, 5, 8-10"
                value={ranges}
                disabled={busy}
                onChange={(event) => setRanges(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Selected pages are combined into one PDF, in the order you list them.
              </p>
            </TabsContent>

            <TabsContent value="every-page" className="pt-2">
              <p className="text-sm text-muted-foreground">
                Every page becomes its own PDF. You&apos;ll get a ZIP file.
              </p>
            </TabsContent>

            <TabsContent value="chunks" className="space-y-2 pt-2">
              <Label htmlFor="chunk-size">Pages per file</Label>
              <Input
                id="chunk-size"
                type="number"
                min={1}
                max={Math.max(1, pageCount - 1)}
                value={chunkSize}
                disabled={busy}
                onChange={(event) => setChunkSize(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The document is cut into files of this many pages. You&apos;ll get a ZIP file.
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetAll} disabled={busy}>
              Clear
            </Button>
            <Button onClick={handleSplit} disabled={busy}>
              {processing ? <Loader2 className="animate-spin" /> : <Scissors />}
              {processing ? "Splitting…" : "Split PDF"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
