"use client";

import { useCallback, useState } from "react";
import { LIMITS } from "@/config/limits";
import { handleError } from "@/lib/errors";
import { validateFile, validateFileCount } from "@/lib/validation/files";

export interface FileItem {
  id: string;
  file: File;
}

interface Options {
  accept?: readonly string[];
  maxFiles?: number;
}

/**
 * Ordered list of validated files. Invalid files are skipped with a toast;
 * valid ones in the same drop are still added.
 */
export function useFileList({ accept, maxFiles = LIMITS.maxFilesPerJob as number }: Options = {}) {
  const [items, setItems] = useState<FileItem[]>([]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const valid: FileItem[] = [];
      for (const file of incoming) {
        try {
          validateFile(file, { accept });
          valid.push({ id: crypto.randomUUID(), file });
        } catch (error) {
          handleError(error);
        }
      }
      if (valid.length === 0) return;

      try {
        validateFileCount(items.length, valid.length, maxFiles);
      } catch (error) {
        handleError(error);
        return;
      }
      setItems((current) => [...current, ...valid]);
    },
    [accept, maxFiles, items.length],
  );

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, addFiles, remove, move, clear };
}
