"use client";

import { useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageGridProps {
  thumbs: (string | null)[];
  /** Extra clockwise rotation (degrees) to preview per page. */
  rotations?: number[];
  /** Pages shown dimmed, e.g. marked for deletion. */
  dimmed?: Set<number>;
  /** Controls rendered under each thumbnail. */
  renderActions?: (index: number) => ReactNode;
  /** Makes the thumbnail itself clickable. */
  onPageClick?: (index: number) => void;
  /** Enables drag-and-drop; called with the dragged position and the drop position. */
  onReorder?: (from: number, to: number) => void;
  /** Overrides the number shown under each page (defaults to its position). */
  labels?: number[];
}

export function PageGrid({
  thumbs,
  rotations,
  dimmed,
  renderActions,
  onPageClick,
  onReorder,
  labels,
}: PageGridProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {thumbs.map((thumb, index) => {
        const rotation = rotations?.[index] ?? 0;
        const isDimmed = dimmed?.has(index) ?? false;

        const preview = (
          <div
            className={cn(
              "flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2 transition-opacity",
              isDimmed && "opacity-30",
            )}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={`Page ${index + 1}`}
                className="max-h-full max-w-full object-contain shadow-sm transition-transform duration-200"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ) : (
              <Skeleton className="h-full w-3/4" />
            )}
          </div>
        );

        return (
          <li
            key={labels?.[index] ?? index}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg",
              onReorder && "cursor-grab active:cursor-grabbing",
              dragFrom === index && "opacity-40",
              dragOver === index && dragFrom !== index && "ring-2 ring-primary",
            )}
            draggable={Boolean(onReorder)}
            onDragStart={() => onReorder && setDragFrom(index)}
            onDragOver={(event) => {
              if (dragFrom === null) return;
              event.preventDefault();
              setDragOver(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragFrom !== null && dragFrom !== index) onReorder?.(dragFrom, index);
              endDrag();
            }}
            onDragEnd={endDrag}
          >
            {onPageClick ? (
              <button
                type="button"
                onClick={() => onPageClick(index)}
                aria-pressed={isDimmed}
                aria-label={`Page ${index + 1}${isDimmed ? ", marked for deletion" : ""}`}
                className="w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {preview}
              </button>
            ) : (
              preview
            )}
            <span className="text-xs text-muted-foreground">{(labels?.[index] ?? index) + 1}</span>
            {renderActions?.(index)}
          </li>
        );
      })}
    </ul>
  );
}
