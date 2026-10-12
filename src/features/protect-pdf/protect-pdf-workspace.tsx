"use client";

import { useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { PasswordField } from "@/components/tools/password-field";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MIME } from "@/config/limits";
import { useFileList } from "@/hooks/use-file-list";
import { protectPdfRemote } from "@/lib/api/security";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import type { ToolState } from "@/types/tool";

const ACCEPT = ACCEPTED_MIME.pdf;

interface Result {
  blob: Blob;
  filename: string;
}

export function ProtectPdfWorkspace() {
  const { items, addFiles, clear } = useFileList({ accept: ACCEPT, maxFiles: 1 });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const current = items[0];
  const processing = state === "processing";
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = Boolean(current) && password.length > 0 && password === confirm && !processing;

  const resetAll = () => {
    abortRef.current?.abort();
    clear();
    setPassword("");
    setConfirm("");
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  const handleProtect = async () => {
    if (!current || !canSubmit) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("processing");

    try {
      const blob = await protectPdfRemote(current.file, password, controller.signal);
      setResult({
        blob,
        filename: `${current.file.name.replace(/\.pdf$/i, "")}_protected.pdf`,
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
        detail="Anyone opening this file will need your password. Keep it safe: it can't be recovered."
        onDownload={() => downloadBlob(result.blob, result.filename)}
        onReset={resetAll}
      />
    );
  }

  if (state === "error") {
    return <ErrorPanel message={errorMessage} onRetry={() => setState("idle")} />;
  }

  if (!current) {
    return (
      <Dropzone
        accept={ACCEPT.join(",")}
        multiple={false}
        label="Select a PDF file"
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
        void handleProtect();
      }}
    >
      <FileList items={items} onRemove={resetAll} disabled={processing} />

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          disabled={processing}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          disabled={processing}
          error={mismatch ? "Passwords don't match." : undefined}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Your file is uploaded to our server for encryption (AES-256) and deleted immediately afterwards. If
        you forget the password, the file can&apos;t be recovered.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={resetAll} disabled={processing}>
          Clear
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {processing ? <Loader2 className="animate-spin" /> : <Lock />}
          {processing ? "Protecting…" : "Protect PDF"}
        </Button>
      </div>
    </form>
  );
}
