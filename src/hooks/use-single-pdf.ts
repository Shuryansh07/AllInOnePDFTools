"use client";

import { useCallback, useState } from "react";
import { ACCEPTED_MIME } from "@/config/limits";
import { handleError } from "@/lib/errors";
import { loadPdf } from "@/lib/pdf/load";
import { validateFile } from "@/lib/validation/files";

/** One selected PDF, validated and parsed up front so the page count is known. */
export function useSinglePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const select = useCallback(async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;

    setLoading(true);
    try {
      validateFile(picked, { accept: ACCEPTED_MIME.pdf });
      const doc = await loadPdf(picked);
      setFile(picked);
      setPageCount(doc.getPageCount());
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
  }, []);

  return { file, pageCount, loading, select, reset };
}
