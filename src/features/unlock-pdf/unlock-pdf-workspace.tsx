"use client";

import { useRef, useState } from "react";
import { Loader2, LockOpen } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { PasswordField } from "@/components/tools/password-field";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME } from "@/config/limits";
import { useFileList } from "@/hooks/use-file-list";
import { unlockPdfRemote } from "@/lib/api/security";
import { downloadBlob } from "@/lib/download";
import { ERROR_CODES, handleError } from "@/lib/errors";
import type { ToolState } from "@/types/tool";

const ACCEPT = ACCEPTED_MIME.pdf;

interface Result {
  blob: Blob;
  filename: string;
}

export function UnlockPdfWorkspace() {
  const { items, addFiles, clear } = useFileList({ accept: ACCEPT, maxFiles: 1 });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const current = items[0];
  const processing = state === "processing";
  const canSubmit = Boolean(current) && password.length > 0 && !processing;

  const resetAll = () => {
    abortRef.current?.abort();
    clear();
    setPassword("");
    setPasswordError("");
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleUnlock = async () => {
    if (!current || !canSubmit) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPasswordError("");
    setState("processing");

    try {
      const blob = await unlockPdfRemote(current.file, password, controller.signal);
      setResult({
        blob,
        filename: `${current.file.name.replace(/\.pdf$/i, "")}_unlocked.pdf`,
      });
      setState("done");
    } catch (error) {
      if (controller.signal.aborted) return;
      const appError = handleError(error);

      // A wrong password isn't a dead end: stay on the form and let them retry inline.
      if (appError.code === ERROR_CODES.INVALID_PASSWORD) {
        setPasswordError(appError.userMessage);
        setState("ready");
        return;
      }
      setErrorMessage(appError.userMessage);
      setState("error");
    }
  };

  if (state === "done" && result) {
    return (
      <ResultPanel
        filename={result.filename}
        sizeBytes={result.blob.size}
        detail="Password protection has been removed from this copy."
        onDownload={() => downloadBlob(result.blob, result.filename)}
        onReset={resetAll}
      />
    );
  }

  if (state === "error") {
    return <ErrorPanel message={errorMessage} onRetry={() => setState("ready")} />;
  }

  if (!current) {
    return (
      <Dropzone
        accept={ACCEPT.join(",")}
        multiple={false}
        label="Select a protected PDF"
        hint="or drag and drop it here"
        onFiles={addFiles}
      />
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleUnlock();
      }}
    >
      <FileList items={items} onRemove={resetAll} disabled={processing} />

      <div className="max-w-md">
        <PasswordField
          label="PDF password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setPasswordError("");
          }}
          disabled={processing}
          autoComplete="current-password"
          error={passwordError || undefined}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        You need the password to unlock a file. We can&apos;t recover or bypass passwords. Your file is
        uploaded for processing and deleted immediately afterwards.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={resetAll} disabled={processing}>
          Clear
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {processing ? <Loader2 className="animate-spin" /> : <LockOpen />}
          {processing ? "Unlocking…" : "Unlock PDF"}
        </Button>
      </div>
    </form>
  );
}
