"use client";

import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXT_LINE_HEIGHT, type EditElement } from "@/lib/pdf/edit";
import { cn } from "@/lib/utils";

export interface BoxPatch {
  u?: number;
  v?: number;
  w?: number;
  h?: number;
}

interface PageCanvasProps {
  imageUrl: string | null;
  /** Displayed page size in PDF points; used for aspect ratio and font scaling. */
  pageWidth: number;
  pageHeight: number;
  /** Rendered between the page image and the movable elements (e.g. click targets for existing text). */
  underlay?: ReactNode;
  /** Elements on the current page only. */
  elements: EditElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: BoxPatch) => void;
  onDelete: (id: string) => void;
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: { u: number; v: number; w: number; h: number };
  rect: DOMRect;
}

const MIN_SIZE = 0.02;
const NUDGE = 0.004;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function PageCanvas({
  imageUrl,
  pageWidth,
  pageHeight,
  underlay,
  elements,
  selectedId,
  onSelect,
  onChange,
  onDelete,
}: PageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const startDrag = (event: PointerEvent, element: EditElement, mode: DragState["mode"]) => {
    event.stopPropagation();
    onSelect(element.id);

    const container = containerRef.current;
    if (!container) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: element.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        u: element.u,
        v: element.v,
        w: element.kind === "text" ? 0 : element.w,
        h: element.kind === "text" ? 0 : element.h,
      },
      rect: container.getBoundingClientRect(),
    };
  };

  const moveDrag = (event: PointerEvent, element: EditElement) => {
    const state = drag.current;
    if (!state || state.id !== element.id) return;

    const du = (event.clientX - state.startX) / state.rect.width;
    const dv = (event.clientY - state.startY) / state.rect.height;

    if (state.mode === "move") {
      const width = element.kind === "text" ? 0.05 : element.w;
      const height = element.kind === "text" ? 0.03 : element.h;
      onChange(element.id, {
        u: clamp(state.origin.u + du, 0, 1 - width),
        v: clamp(state.origin.v + dv, 0, 1 - height),
      });
      return;
    }

    if (element.kind === "rect") {
      onChange(element.id, {
        w: clamp(state.origin.w + du, MIN_SIZE, 1 - state.origin.u),
        h: clamp(state.origin.h + dv, MIN_SIZE, 1 - state.origin.v),
      });
    } else if (element.kind === "image") {
      // Keep the picture's proportions: h = w * (pageWidth / pageHeight) * (natH / natW).
      const ratio = (pageWidth / pageHeight) * (element.naturalHeight / element.naturalWidth);
      let w = clamp(state.origin.w + du, MIN_SIZE, 1 - state.origin.u);
      let h = w * ratio;
      if (state.origin.v + h > 1) {
        h = 1 - state.origin.v;
        w = h / ratio;
      }
      onChange(element.id, { w, h });
    }
  };

  const endDrag = () => {
    drag.current = null;
  };

  const handleKey = (event: KeyboardEvent, element: EditElement) => {
    if (event.target !== event.currentTarget) return;

    const step = event.shiftKey ? NUDGE * 5 : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete(element.id);
    } else if (moves[event.key]) {
      event.preventDefault();
      const [du, dv] = moves[event.key];
      onChange(element.id, { u: clamp(element.u + du, 0, 0.98), v: clamp(element.v + dv, 0, 0.98) });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-3xl touch-none overflow-hidden rounded-lg border bg-muted/40 shadow-sm select-none"
      style={{ aspectRatio: `${pageWidth} / ${pageHeight}`, containerType: "inline-size" }}
      onPointerDown={() => onSelect(null)}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 size-full" />
      ) : (
        <Skeleton className="absolute inset-0 size-full" />
      )}

      {underlay}

      {elements.map((element) => {
        const selected = element.id === selectedId;
        const common = {
          role: "button" as const,
          tabIndex: 0,
          "aria-label":
            element.kind === "text" ? `Text: ${element.text.slice(0, 40)}` : element.kind === "image" ? "Image" : "Shape",
          onPointerDown: (event: PointerEvent) => startDrag(event, element, "move"),
          onPointerMove: (event: PointerEvent) => moveDrag(event, element),
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
          onKeyDown: (event: KeyboardEvent) => handleKey(event, element),
          onFocus: () => onSelect(element.id),
        };

        const outline = cn(
          "absolute cursor-move outline-none",
          selected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/60 focus-visible:ring-2",
        );

        if (element.kind === "text") {
          return (
            <div
              key={element.id}
              {...common}
              className={cn(outline, "px-0.5")}
              style={{
                left: `${element.u * 100}%`,
                top: `${element.v * 100}%`,
                fontSize: `${(element.fontSize / pageWidth) * 100}cqw`,
                lineHeight: TEXT_LINE_HEIGHT,
                color: element.color,
                whiteSpace: "pre",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              {element.text || " "}
            </div>
          );
        }

        const box = {
          left: `${element.u * 100}%`,
          top: `${element.v * 100}%`,
          width: `${element.w * 100}%`,
          height: `${element.h * 100}%`,
        };

        return (
          <div key={element.id} {...common} className={outline} style={box}>
            {element.kind === "rect" ? (
              <div
                className="size-full"
                style={{ backgroundColor: element.color, opacity: element.opacity }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={element.previewUrl} alt="" draggable={false} className="size-full" />
            )}
            {selected && (
              <span
                aria-hidden
                className="absolute -right-1.5 -bottom-1.5 size-3.5 cursor-nwse-resize rounded-sm border-2 border-background bg-primary"
                onPointerDown={(event) => startDrag(event, element, "resize")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
