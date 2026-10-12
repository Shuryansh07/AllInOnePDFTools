"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  /** Value for the input's accept attribute, e.g. "application/pdf". */
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  disabled = false,
  label = "Select PDF files",
  hint = "or drag and drop them here",
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={label}
      onClick={open}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Upload className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          // Allow selecting the same file again.
          event.target.value = "";
        }}
      />
    </div>
  );
}
