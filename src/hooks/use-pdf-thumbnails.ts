"use client";

import { useEffect, useState } from "react";
import { handleError } from "@/lib/errors";
import { openPdfPreview } from "@/lib/pdf/preview";

const THUMB_WIDTH = 220;

/** Renders page thumbnails one by one so the grid fills in progressively. */
export function usePdfThumbnails(file: File | null, pageCount: number) {
  const [thumbs, setThumbs] = useState<(string | null)[]>([]);

  useEffect(() => {
    // Reset when the file changes; thumbnails fill in below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThumbs(Array.from({ length: pageCount }, () => null));
    if (!file || pageCount === 0) return;

    let cancelled = false;
    let destroy: (() => void) | undefined;

    (async () => {
      try {
        const preview = await openPdfPreview(file);
        destroy = preview.destroy;
        for (let index = 0; index < preview.pageCount; index++) {
          if (cancelled) return;
          const url = await preview.renderPage(index, THUMB_WIDTH);
          if (cancelled) return;
          setThumbs((current) => {
            const next = [...current];
            next[index] = url;
            return next;
          });
        }
      } catch (error) {
        if (!cancelled) handleError(error);
      }
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [file, pageCount]);

  return thumbs;
}
