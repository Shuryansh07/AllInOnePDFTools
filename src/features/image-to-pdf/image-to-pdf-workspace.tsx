"use client";

import { useState } from "react";
import { FileImage, Loader2 } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACCEPTED_MIME } from "@/config/limits";
import { useFileList } from "@/hooks/use-file-list";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { imagesToPdf, type PageMargin, type PageSize } from "@/lib/pdf/images";
import type { ToolState } from "@/types/tool";

const ACCEPT = ACCEPTED_MIME.image;
const OUTPUT_NAME = "images.pdf";

export function ImageToPdfWorkspace() {
  const { items, addFiles, remove, move, clear } = useFileList({ accept: ACCEPT });
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<PageMargin>("small");
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const hasFiles = items.length > 0;
  const processing = state === "processing";

  const handleConvert = async () => {
    setState("processing");
    try {
      const bytes = await imagesToPdf(
        items.map((item) => item.file),
        { pageSize, margin },
      );
      setResult(new Blob([bytes as BlobPart], { type: "application/pdf" }));
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
        sizeBytes={result.size}
        onDownload={() => downloadBlob(result, OUTPUT_NAME)}
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
        label={hasFiles ? "Add more images" : "Select JPG or PNG images"}
      />

      {hasFiles && (
        <>
          <FileList items={items} onRemove={remove} onMove={move} disabled={processing} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Page size</Label>
              <Tabs value={pageSize} onValueChange={(value) => setPageSize(value as PageSize)}>
                <TabsList>
                  <TabsTrigger value="a4">A4</TabsTrigger>
                  <TabsTrigger value="letter">Letter</TabsTrigger>
                  <TabsTrigger value="fit">Fit to image</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label>Margin</Label>
              <Tabs
                value={pageSize === "fit" ? "none" : margin}
                onValueChange={(value) => setMargin(value as PageMargin)}
              >
                <TabsList>
                  <TabsTrigger value="none" disabled={pageSize === "fit"}>
                    None
                  </TabsTrigger>
                  <TabsTrigger value="small" disabled={pageSize === "fit"}>
                    Small
                  </TabsTrigger>
                  <TabsTrigger value="large" disabled={pageSize === "fit"}>
                    Large
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              One image per page, in the order shown.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear} disabled={processing}>
                Clear
              </Button>
              <Button onClick={handleConvert} disabled={processing}>
                {processing ? <Loader2 className="animate-spin" /> : <FileImage />}
                {processing ? "Converting…" : "Convert to PDF"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
