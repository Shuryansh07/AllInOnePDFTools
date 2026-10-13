"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { Dropzone } from "@/components/tools/dropzone";
import { FileList } from "@/components/tools/file-list";
import { ErrorPanel, ResultPanel } from "@/components/tools/result-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_MIME } from "@/config/limits";
import { downloadBlob } from "@/lib/download";
import { handleError } from "@/lib/errors";
import { MuPdfClient } from "@/lib/mupdf/client";
import type { PageSize, TextEdit, TextLine } from "@/lib/mupdf/engine";
import { applyEdits, type EditElement, type ImageElement } from "@/lib/pdf/edit";
import { normalizeJpeg } from "@/lib/pdf/images";
import { validateFile } from "@/lib/validation/files";
import { cn } from "@/lib/utils";
import type { ToolState } from "@/types/tool";
import { PageCanvas, type BoxPatch } from "./page-canvas";

const textareaClass =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/** A change to a line of text that already exists in the PDF. */
interface LineChange {
  newText: string;
  fontSize: number;
  color: string;
}

const lineKey = (page: number, index: number) => `${page}:${index}`;

/** Spread new elements out a little so stacked ones don't hide each other. */
const cascade = (count: number) => 0.08 + (count % 6) * 0.04;

interface Result {
  blob: Blob;
  filename: string;
  summary: string;
}

interface PreviewJob {
  page: number;
  scale: number;
  edits: TextEdit[];
  /** Version of the edits when this job was made; a newer version supersedes it. */
  token: number;
}

/** The changed lines as engine edits, optionally for one page. Lines opened but left as-is are skipped. */
function textEditsFrom(
  changes: Record<string, LineChange>,
  linesByPage: Record<number, TextLine[]>,
  onlyPage?: number,
): TextEdit[] {
  const edits: TextEdit[] = [];
  for (const [key, change] of Object.entries(changes)) {
    const [pageText, indexText] = key.split(":");
    const page = Number(pageText);
    if (onlyPage !== undefined && page !== onlyPage) continue;

    const line = linesByPage[page]?.[Number(indexText)];
    if (!line) continue;
    if (change.newText === line.text && change.fontSize === line.fontSize && change.color === line.color) continue;

    edits.push({ page, bbox: line.bbox, newText: change.newText, fontSize: change.fontSize, color: change.color });
  }
  return edits;
}

/**
 * One editor for both jobs:
 *  - click existing text to REPLACE it (MuPDF removes the original, then writes the new text);
 *  - add NEW text, images and shapes anywhere (pdf-lib), drag and resize them.
 *
 * MuPDF renders the page, so both kinds of edit share one view and one coordinate system
 * (fractions of the page as displayed, top-left origin).
 */
export function EditPdfWorkspace() {
  const clientRef = useRef<MuPdfClient | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pageImages = useRef<Map<number, string>>(new Map());

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<PageSize[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [lines, setLines] = useState<TextLine[]>([]);
  const [linesByPage, setLinesByPage] = useState<Record<number, TextLine[]>>({});

  // Replacements of existing text, keyed "page:lineIndex".
  const [lineChanges, setLineChanges] = useState<Record<string, LineChange>>({});
  // New items. At most one thing (an element OR a line) is selected at a time.
  const [elements, setElements] = useState<EditElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const [state, setState] = useState<ToolState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Live preview of replaced text: the page re-rendered with the edits applied (not saved anywhere).
  const [preview, setPreview] = useState<{ page: number; url: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<{ page: number; url: string } | null>(null);
  const previewJob = useRef<{ inFlight: boolean; pending: PreviewJob | null; token: number }>({
    inFlight: false,
    pending: null,
    token: 0,
  });

  // Release the worker, cached page images and preview URLs when leaving the page.
  const elementsRef = useRef<EditElement[]>([]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  useEffect(() => {
    const images = pageImages.current;
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
      images.forEach((url) => URL.revokeObjectURL(url));
      images.clear();
      for (const element of elementsRef.current) {
        if (element.kind === "image" && element.previewUrl) URL.revokeObjectURL(element.previewUrl);
      }
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    };
  }, []);

  // Load the current page's picture and text lines.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || pages.length === 0) return;

    let cancelled = false;
    setPageLoading(true);

    const cachedImage = pageImages.current.get(pageIndex);
    const cachedLines = linesByPage[pageIndex];

    (async () => {
      try {
        const size = pages[pageIndex];
        const scale = Math.min(2.5, 1100 / size.width);

        const [imageUrl, pageLines] = await Promise.all([
          cachedImage ??
            client.render(pageIndex, scale).then((png) => {
              const url = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
              pageImages.current.set(pageIndex, url);
              return url;
            }),
          cachedLines ?? client.getLines(pageIndex),
        ]);

        if (cancelled) return;
        setPageImage(imageUrl);
        setLines(pageLines);
        setLinesByPage((current) => (current[pageIndex] ? current : { ...current, [pageIndex]: pageLines }));
        setPageLoading(false);
      } catch (error) {
        if (!cancelled) {
          setPageLoading(false);
          handleError(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // linesByPage is only read as a cache; depending on it would re-run this after every load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pages]);

  // Re-render the current page with the replaced text applied, shortly after the user stops typing.
  // At most one render runs at a time; if more edits arrive meanwhile, only the latest is rendered next.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || pages.length === 0) return;

    const job = previewJob.current;
    const token = ++job.token;
    const edits = textEditsFrom(lineChanges, linesByPage, pageIndex);

    if (edits.length === 0) {
      job.pending = null;
      // Drop the old picture (in a timer, not synchronously in the effect). The render below also
      // ignores it immediately, so it is never shown while it is stale.
      const clear = setTimeout(() => {
        setPreview((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return null;
        });
      }, 0);
      return () => clearTimeout(clear);
    }

    const run = (next: PreviewJob) => {
      job.inFlight = true;
      setPreviewing(true);
      client
        .preview(next.page, next.scale, next.edits)
        .then((png) => {
          if (next.token !== job.token) return; // superseded by a newer edit
          const url = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
          setPreview((current) => {
            if (current) URL.revokeObjectURL(current.url);
            return { page: next.page, url };
          });
        })
        .catch((error) => {
          // Closing the editor rejects in-flight work; that isn't a problem worth reporting.
          if (clientRef.current === client) handleError(error);
        })
        .finally(() => {
          job.inFlight = false;
          const queued = job.pending;
          job.pending = null;
          if (queued && clientRef.current === client) run(queued);
          else setPreviewing(false);
        });
    };

    const timer = setTimeout(() => {
      const next: PreviewJob = {
        page: pageIndex,
        scale: Math.min(2.5, 1100 / pages[pageIndex].width),
        edits,
        token,
      };
      if (job.inFlight) job.pending = next;
      else run(next);
    }, 150);

    return () => clearTimeout(timer);
  }, [lineChanges, linesByPage, pageIndex, pages]);

  const busy = loading || state === "processing";
  const size = pages[pageIndex];
  // Only show a preview that belongs to this page AND while this page still has replaced text.
  const pageHasEdits = textEditsFrom(lineChanges, linesByPage, pageIndex).length > 0;
  const shownImage = preview && preview.page === pageIndex && pageHasEdits ? preview.url : pageImage;
  const pageElements = elements.filter((element) => element.page === pageIndex);
  const selectedElement = elements.find((element) => element.id === selectedId) ?? null;
  const activeLine = selectedLine === null ? null : (lines[selectedLine] ?? null);
  const activeChange = selectedLine === null ? undefined : lineChanges[lineKey(pageIndex, selectedLine)];
  const lineChangeCount = Object.keys(lineChanges).length;
  const totalChanges = lineChangeCount + elements.length;

  const selectElement = (id: string | null) => {
    setSelectedId(id);
    if (id !== null) setSelectedLine(null);
  };
  const selectLine = (index: number | null) => {
    setSelectedLine(index);
    if (index !== null) setSelectedId(null);
  };

  const goToPage = (next: number) => {
    setPageIndex(next);
    setSelectedId(null);
    setSelectedLine(null);
  };

  // ---------- opening ----------

  const handleFile = async (files: File[]) => {
    const picked = files[0];
    if (!picked) return;

    setLoading(true);
    try {
      validateFile(picked, { accept: ACCEPTED_MIME.pdf });
      const bytes = new Uint8Array(await picked.arrayBuffer());

      clientRef.current?.dispose();
      const client = new MuPdfClient();
      clientRef.current = client;

      const opened = await client.open(bytes);
      pageImages.current.forEach((url) => URL.revokeObjectURL(url));
      pageImages.current.clear();

      setFile(picked);
      setPageIndex(0);
      setLinesByPage({});
      setLineChanges({});
      setPages(opened.pages);
    } catch (error) {
      clientRef.current?.dispose();
      clientRef.current = null;
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    clientRef.current?.dispose();
    clientRef.current = null;
    pageImages.current.forEach((url) => URL.revokeObjectURL(url));
    pageImages.current.clear();
    for (const element of elements) {
      if (element.kind === "image" && element.previewUrl) URL.revokeObjectURL(element.previewUrl);
    }

    previewJob.current.token++;
    previewJob.current.pending = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    setPreview(null);
    setPreviewing(false);

    setFile(null);
    setPages([]);
    setLines([]);
    setLinesByPage({});
    setLineChanges({});
    setElements([]);
    setSelectedId(null);
    setSelectedLine(null);
    setPageImage(null);
    setPageIndex(0);
    setResult(null);
    setErrorMessage("");
    setState("idle");
  };

  // ---------- replacing existing text ----------

  const updateLineChange = (patch: Partial<LineChange>) => {
    if (selectedLine === null || !activeLine) return;
    const key = lineKey(pageIndex, selectedLine);
    setLineChanges((current) => {
      const base: LineChange = current[key] ?? {
        newText: activeLine.text,
        fontSize: activeLine.fontSize,
        color: activeLine.color,
      };
      return { ...current, [key]: { ...base, ...patch } };
    });
  };

  const revertLine = () => {
    if (selectedLine === null) return;
    const key = lineKey(pageIndex, selectedLine);
    setLineChanges((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  // ---------- adding new items ----------

  const patchElement = (id: string, patch: Partial<EditElement>) =>
    setElements((current) =>
      current.map((element) => (element.id === id ? ({ ...element, ...patch } as EditElement) : element)),
    );

  const removeElement = (id: string) => {
    setElements((current) => {
      const target = current.find((element) => element.id === id);
      if (target?.kind === "image" && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((element) => element.id !== id);
    });
    setSelectedId((current) => (current === id ? null : current));
  };

  const addText = () => {
    const id = crypto.randomUUID();
    const offset = cascade(pageElements.length);
    setElements((current) => [
      ...current,
      { id, kind: "text", page: pageIndex, u: offset, v: offset, text: "Your text", fontSize: 18, color: "#000000" },
    ]);
    selectElement(id);
  };

  const addRect = () => {
    const id = crypto.randomUUID();
    const offset = cascade(pageElements.length);
    setElements((current) => [
      ...current,
      { id, kind: "rect", page: pageIndex, u: offset, v: offset, w: 0.25, h: 0.08, color: "#ffff00", opacity: 0.4 },
    ]);
    selectElement(id);
  };

  const addImage = async (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked || !size) return;

    try {
      validateFile(picked, { accept: ACCEPTED_MIME.image });
      const mime = picked.type as ImageElement["mime"];
      const bytes = mime === "image/jpeg" ? await normalizeJpeg(picked) : new Uint8Array(await picked.arrayBuffer());

      const blob = new Blob([bytes as BlobPart], { type: mime });
      const bitmap = await createImageBitmap(blob);
      const { width: naturalWidth, height: naturalHeight } = bitmap;
      bitmap.close();

      // Start at 30% of the page width, shrinking if that would be taller than the page.
      const ratio = (size.width / size.height) * (naturalHeight / naturalWidth);
      let w = 0.3;
      if (w * ratio > 0.8) w = 0.8 / ratio;
      const offset = cascade(pageElements.length);

      const id = crypto.randomUUID();
      setElements((current) => [
        ...current,
        {
          id,
          kind: "image",
          page: pageIndex,
          u: offset,
          v: offset,
          w,
          h: w * ratio,
          bytes,
          mime,
          naturalWidth,
          naturalHeight,
          previewUrl: URL.createObjectURL(blob),
        },
      ]);
      selectElement(id);
    } catch (error) {
      handleError(error);
    }
  };

  // ---------- saving ----------

  const handleSave = async () => {
    const client = clientRef.current;
    if (!client || !file) return;

    const textEdits = textEditsFrom(lineChanges, linesByPage);

    setState("processing");
    try {
      let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());

      // 1. Replace existing text first, so nothing the user adds can be caught by the removal.
      if (textEdits.length > 0) bytes = await client.apply(textEdits);

      // 2. Then lay the new items on top.
      if (elements.length > 0) {
        bytes = await applyEdits(new File([bytes as BlobPart], file.name, { type: "application/pdf" }), elements);
      }

      const parts: string[] = [];
      if (textEdits.length > 0) {
        parts.push(`${textEdits.length} ${textEdits.length === 1 ? "line" : "lines"} replaced (original text removed)`);
      }
      if (elements.length > 0) {
        parts.push(`${elements.length} ${elements.length === 1 ? "item" : "items"} added`);
      }

      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        filename: `${file.name.replace(/\.pdf$/i, "")}_edited.pdf`,
        summary: parts.join(" · "),
      });
      setState("done");
    } catch (error) {
      const appError = handleError(error);
      setErrorMessage(appError.userMessage);
      setState("error");
    }
  };

  // ---------- render ----------

  if (state === "done" && result) {
    return (
      <ResultPanel
        filename={result.filename}
        sizeBytes={result.blob.size}
        detail={result.summary}
        onDownload={() => downloadBlob(result.blob, result.filename)}
        onReset={resetAll}
      />
    );
  }

  if (state === "error") {
    // Keep the user's work: go back to the editor, not to a blank page.
    return <ErrorPanel message={errorMessage} onRetry={() => setState("idle")} />;
  }

  if (!file) {
    return (
      <div className="space-y-3">
        <Dropzone
          accept={ACCEPTED_MIME.pdf.join(",")}
          multiple={false}
          disabled={loading}
          label={loading ? "Loading the editor engine…" : "Select a PDF to edit"}
          hint={loading ? "The first time takes a little longer (about 4 MB)." : "or drag and drop it here"}
          onFiles={handleFile}
        />
        {loading && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Starting the editor…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FileList items={[{ id: file.name, file }]} onRemove={resetAll} disabled={busy} />

      <Alert>
        <Info />
        <AlertDescription>
          Click existing text on the page to change it, or use the buttons to add new text, images and shapes. Changed
          text is removed from the file and re-written in Helvetica. Shapes only cover content, so don&apos;t rely on
          them to hide secrets. Editing works on PDFs with real text, not scans.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addText} disabled={busy}>
          <Type /> Add text
        </Button>
        <Button variant="outline" onClick={() => imageInputRef.current?.click()} disabled={busy || !size}>
          <ImagePlus /> Add image
        </Button>
        <Button variant="outline" onClick={addRect} disabled={busy}>
          <Square /> Add shape
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPTED_MIME.image.join(",")}
          hidden
          onChange={(event) => {
            void addImage(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={busy || pageIndex === 0}
            onClick={() => goToPage(pageIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-24 text-center text-sm text-muted-foreground" aria-live="polite">
            Page {pageIndex + 1} of {pages.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={busy || pageIndex >= pages.length - 1}
            onClick={() => goToPage(pageIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {size ? (
          <div className="relative">
            <PageCanvas
              imageUrl={shownImage}
              pageWidth={size.width}
              pageHeight={size.height}
              underlay={lines.map((line, index) => {
                const [x0, y0, x1, y1] = line.bbox;
                const changed = Boolean(lineChanges[lineKey(pageIndex, index)]);
                const active = selectedLine === index;
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Edit text: ${line.text.trim().slice(0, 60)}`}
                    aria-pressed={active}
                    disabled={busy}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => selectLine(index)}
                    className={cn(
                      "absolute rounded-sm outline-none transition-colors",
                      "hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary",
                      active && "bg-primary/20 ring-2 ring-primary",
                      changed && !active && "bg-green-500/25 ring-1 ring-green-600",
                    )}
                    style={{
                      left: `${(x0 / size.width) * 100}%`,
                      top: `${(y0 / size.height) * 100}%`,
                      width: `${((x1 - x0) / size.width) * 100}%`,
                      height: `${((y1 - y0) / size.height) * 100}%`,
                    }}
                  />
                );
              })}
              elements={pageElements}
              selectedId={selectedId}
              onSelect={selectElement}
              onChange={(id: string, patch: BoxPatch) => patchElement(id, patch)}
              onDelete={removeElement}
            />
            {pageLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
            {previewing && !pageLoading && (
              <span
                role="status"
                className="pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm"
              >
                <Loader2 className="size-3 animate-spin" /> Updating preview
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading page…
          </div>
        )}

        <aside className="space-y-4 rounded-xl border p-4" aria-label="Selected item">
          {!selectedElement && !activeLine && (
            <p className="text-sm text-muted-foreground">
              {pageLoading
                ? "Reading the page…"
                : lines.length === 0
                  ? "No existing text was found on this page (it may be a scan). You can still add text, images and shapes."
                  : "Click a line of text to change it, or add something new. Changed text turns green."}
            </p>
          )}

          {activeLine && (
            <>
              <div className="space-y-1">
                <Label>Original text</Label>
                <p className="rounded-md bg-muted px-2 py-1.5 text-sm break-words">{activeLine.text.trim()}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="line-text">New text</Label>
                <textarea
                  id="line-text"
                  className={textareaClass}
                  value={activeChange?.newText ?? activeLine.text}
                  onChange={(event) => updateLineChange({ newText: event.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="line-size">Size (pt)</Label>
                  <Input
                    id="line-size"
                    type="number"
                    min={4}
                    max={200}
                    value={activeChange?.fontSize ?? activeLine.fontSize}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value >= 1) updateLineChange({ fontSize: Math.min(value, 200) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-color">Colour</Label>
                  <input
                    id="line-color"
                    type="color"
                    className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1"
                    value={activeChange?.color ?? activeLine.color}
                    onChange={(event) => updateLineChange({ color: event.target.value })}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Original font: {activeLine.fontName || "unknown"}</p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={revertLine} disabled={!activeChange}>
                  <Undo2 /> Undo
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateLineChange({ newText: "" })}
                  disabled={activeChange?.newText === ""}
                >
                  <Trash2 /> Remove line
                </Button>
              </div>
            </>
          )}

          {selectedElement?.kind === "text" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-text">Text</Label>
                <textarea
                  id="edit-text"
                  className={textareaClass}
                  value={selectedElement.text}
                  onChange={(event) => patchElement(selectedElement.id, { text: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-size">Size (pt)</Label>
                  <Input
                    id="edit-size"
                    type="number"
                    min={6}
                    max={200}
                    value={selectedElement.fontSize}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value >= 1) {
                        patchElement(selectedElement.id, { fontSize: Math.min(value, 200) });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color">Colour</Label>
                  <input
                    id="edit-color"
                    type="color"
                    className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1"
                    value={selectedElement.color}
                    onChange={(event) => patchElement(selectedElement.id, { color: event.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {selectedElement?.kind === "rect" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-fill">Fill colour</Label>
                <input
                  id="edit-fill"
                  type="color"
                  className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1"
                  value={selectedElement.color}
                  onChange={(event) => patchElement(selectedElement.id, { color: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-opacity">Opacity: {Math.round(selectedElement.opacity * 100)}%</Label>
                <input
                  id="edit-opacity"
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(selectedElement.opacity * 100)}
                  className="w-full"
                  onChange={(event) =>
                    patchElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patchElement(selectedElement.id, { color: "#ffff00", opacity: 0.4 })}
                >
                  Highlight
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patchElement(selectedElement.id, { color: "#ffffff", opacity: 1 })}
                >
                  White-out
                </Button>
              </div>
            </>
          )}

          {selectedElement?.kind === "image" && (
            <p className="text-sm text-muted-foreground">Drag the corner handle to resize. Proportions are kept.</p>
          )}

          {selectedElement && (
            <Button variant="destructive" className="w-full" onClick={() => removeElement(selectedElement.id)}>
              <Trash2 /> Delete item
            </Button>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalChanges === 0
            ? "No changes yet."
            : [
                lineChangeCount > 0 && `${lineChangeCount} ${lineChangeCount === 1 ? "line" : "lines"} of text changed`,
                elements.length > 0 && `${elements.length} ${elements.length === 1 ? "item" : "items"} added`,
              ]
                .filter(Boolean)
                .join(", ")}
          . Powered by MuPDF (AGPL-3.0) and pdf-lib.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAll} disabled={state === "processing"}>
            Start over
          </Button>
          <Button onClick={handleSave} disabled={busy || totalChanges === 0}>
            {state === "processing" ? <Loader2 className="animate-spin" /> : <Save />}
            {state === "processing" ? "Saving…" : "Save PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
