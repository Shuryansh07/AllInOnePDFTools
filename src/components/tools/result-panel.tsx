"use client";

import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";

interface ResultPanelProps {
  filename: string;
  sizeBytes: number;
  /** Optional extra line, e.g. "Reduced by 42%". */
  detail?: string;
  onDownload: () => void;
  onReset: () => void;
}

export function ResultPanel({ filename, sizeBytes, detail, onDownload, onReset }: ResultPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border px-6 py-10 text-center">
      <CheckCircle2 className="size-10 text-green-600" aria-hidden />
      <div>
        <h2 className="text-xl font-semibold">Your file is ready</h2>
        <p className="text-sm text-muted-foreground">
          {filename} · {formatBytes(sizeBytes)}
        </p>
        {detail && <p className="mt-1 text-sm font-medium">{detail}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="lg" onClick={onDownload}>
          <Download /> Download
        </Button>
        <Button size="lg" variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t process your files</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={onRetry}>
        Back to files
      </Button>
    </div>
  );
}
