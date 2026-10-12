"use client";

import { ArrowDown, ArrowUp, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileItem } from "@/hooks/use-file-list";
import { formatBytes } from "@/lib/format";

interface FileListProps {
  items: FileItem[];
  onRemove: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  disabled?: boolean;
}

export function FileList({ items, onRemove, onMove, disabled }: FileListProps) {
  return (
    <ul className="divide-y rounded-xl border">
      {items.map(({ id, file }, index) => (
        <li key={id} className="flex items-center gap-3 px-3 py-2">
          <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          {onMove && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${file.name} up`}
                disabled={disabled || index === 0}
                onClick={() => onMove(id, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${file.name} down`}
                disabled={disabled || index === items.length - 1}
                onClick={() => onMove(id, 1)}
              >
                <ArrowDown />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${file.name}`}
            disabled={disabled}
            onClick={() => onRemove(id)}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
