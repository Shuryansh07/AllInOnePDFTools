import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as mupdf from "mupdf";
import { beforeAll, describe, expect, it } from "vitest";
import {
  applyTextEdits,
  applyTextEditsInPlace,
  colorToHex,
  countPages,
  getPageSize,
  getTextLines,
  hexToRgb,
  openDocument,
  renderPagePng,
  type Doc,
} from "./engine";

/** A 300x200 page with two lines of Helvetica text at known positions. */
async function samplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 200]);
  page.drawText("Hello World", { x: 50, y: 140, size: 24, font, color: rgb(1, 0, 0) });
  page.drawText("Second line stays", { x: 50, y: 90, size: 16, font });
  return doc.save();
}

let bytes: Uint8Array;
beforeAll(async () => {
  bytes = await samplePdf();
});

const open = (data: Uint8Array = bytes): Doc => openDocument(mupdf, data);
const allText = (doc: Doc) => getTextLines(doc, 0).map((line) => line.text.trim());

describe("colour helpers", () => {
  it("converts gray, RGB and CMYK", () => {
    expect(colorToHex([0])).toBe("#000000");
    expect(colorToHex([1])).toBe("#ffffff");
    expect(colorToHex([1, 0, 0])).toBe("#ff0000");
    expect(colorToHex([0, 0, 0, 1])).toBe("#000000");
    expect(colorToHex([0, 0, 0, 0])).toBe("#ffffff");
    expect(colorToHex(undefined)).toBe("#000000");
  });

  it("parses hex colours", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb("nonsense")).toEqual([0, 0, 0]);
  });
});

describe("reading", () => {
  it("opens a PDF and reports its size and page count", () => {
    const doc = open();
    expect(countPages(doc)).toBe(1);
    expect(getPageSize(doc, 0)).toEqual({ width: 300, height: 200 });
  });

  it("finds each line with its font size and colour", () => {
    const lines = getTextLines(open(), 0);
    expect(lines.map((l) => l.text.trim())).toEqual(["Hello World", "Second line stays"]);

    const [hello, second] = lines;
    expect(hello.fontSize).toBeCloseTo(24, 0);
    expect(hello.color).toBe("#ff0000");
    expect(second.fontSize).toBeCloseTo(16, 0);
    expect(hello.bbox[0]).toBeCloseTo(50, 0);
    // y grows downwards from the top of the page.
    expect(hello.bbox[1]).toBeLessThan(second.bbox[1]);
  });

  it("renders a page to PNG", () => {
    const png = renderPagePng(mupdf, open(), 0, 2);
    // PNG signature.
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("rejects garbage input", () => {
    expect(() => open(new TextEncoder().encode("not a pdf"))).toThrow();
  });
});

describe("applyTextEdits", () => {
  it("really removes the old text and adds the new text", () => {
    const doc = open();
    const [hello] = getTextLines(doc, 0);

    const out = applyTextEdits(mupdf, doc, [
      { page: 0, bbox: hello.bbox, newText: "Goodbye there", fontSize: hello.fontSize, color: hello.color },
    ]);

    const edited = open(out);
    const text = allText(edited);
    expect(text).toContain("Goodbye there");
    expect(text).toContain("Second line stays"); // untouched
    // The key property: the original is gone from the file's text, not just covered.
    expect(text.join(" ")).not.toContain("Hello World");
    expect(Buffer.from(out).toString("latin1")).not.toContain("Hello World");
  });

  it("keeps the replacement where the original was", () => {
    const doc = open();
    const [hello] = getTextLines(doc, 0);
    const out = applyTextEdits(mupdf, doc, [
      { page: 0, bbox: hello.bbox, newText: "Moved?", fontSize: hello.fontSize, color: hello.color },
    ]);

    const replaced = getTextLines(open(out), 0).find((l) => l.text.includes("Moved?"));
    expect(replaced).toBeDefined();
    expect(Math.abs(replaced!.bbox[0] - hello.bbox[0])).toBeLessThan(4); // same left edge
    expect(Math.abs(replaced!.bbox[1] - hello.bbox[1])).toBeLessThan(8); // same vertical position
    expect(replaced!.fontSize).toBeCloseTo(hello.fontSize, 0);
    expect(replaced!.color).toBe(hello.color);
  });

  it("can edit several lines at once, and delete a line by emptying it", () => {
    const doc = open();
    const [hello, second] = getTextLines(doc, 0);
    const out = applyTextEdits(mupdf, doc, [
      { page: 0, bbox: hello.bbox, newText: "One", fontSize: hello.fontSize, color: hello.color },
      { page: 0, bbox: second.bbox, newText: "", fontSize: second.fontSize, color: second.color },
    ]);

    const text = allText(open(out));
    expect(text).toContain("One");
    expect(text.join(" ")).not.toContain("Second line");
  });

  it("handles a replacement that is much longer than the original", () => {
    const doc = open();
    const [hello] = getTextLines(doc, 0);
    const out = applyTextEdits(mupdf, doc, [
      { page: 0, bbox: hello.bbox, newText: "A much longer replacement", fontSize: 12, color: "#0000ff" },
    ]);
    // Stays on a single line (not wrapped) because the box is widened to fit.
    expect(allText(open(out))).toContain("A much longer replacement");
  });

  it("returns bytes the caller owns, not a view into WASM memory", () => {
    const doc = open();
    const [hello] = getTextLines(doc, 0);
    const out = applyTextEdits(mupdf, doc, [
      { page: 0, bbox: hello.bbox, newText: "Owned", fontSize: 20, color: "#000000" },
    ]);

    // A view into the WASM heap would report the whole heap as its buffer.
    expect(out.buffer.byteLength).toBe(out.byteLength);

    // And it must survive further MuPDF work (which may reuse or grow that memory).
    const snapshot = Buffer.from(out).toString("base64");
    for (let i = 0; i < 5; i++) {
      renderPagePng(mupdf, open(), 0, 2);
      open(out);
    }
    expect(Buffer.from(out).toString("base64")).toBe(snapshot);
    expect(allText(open(out))).toContain("Owned");
  });

  it("previews in memory exactly what saving would produce", () => {
    const doc = open();
    const [hello] = getTextLines(doc, 0);
    const edits = [{ page: 0, bbox: hello.bbox, newText: "Live preview", fontSize: 20, color: "#00aa00" }];

    const before = renderPagePng(mupdf, open(), 0, 2);

    const previewDoc = open();
    applyTextEditsInPlace(mupdf, previewDoc, edits);
    const preview = renderPagePng(mupdf, previewDoc, 0, 2);

    // The preview shows the change...
    expect(Buffer.from(preview).equals(Buffer.from(before))).toBe(false);
    expect(allText(previewDoc)).toContain("Live preview");
    expect(allText(previewDoc).join(" ")).not.toContain("Hello World");

    // ...and matches the file that saving produces. Same text, and visually the same picture. It
    // isn't byte-identical: writing and re-reading the file rounds coordinates slightly, which shifts
    // anti-aliasing at glyph edges, so compare pixels with a tolerance.
    const saved = applyTextEdits(mupdf, open(), edits);
    const reopened = open(saved);
    expect(allText(reopened)).toEqual(allText(previewDoc));

    const samples = (d: Doc) =>
      Uint8Array.from(
        d.loadPage(0).toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true).getPixels(),
      );
    const fromPreview = samples(previewDoc);
    const fromSaved = samples(reopened);
    expect(fromSaved.length).toBe(fromPreview.length);

    let differing = 0;
    for (let i = 0; i < fromPreview.length; i++) if (fromPreview[i] !== fromSaved[i]) differing++;
    expect(differing / fromPreview.length).toBeLessThan(0.02); // measured: about 0.5%
  });

  it("requires at least one edit", () => {
    expect(() => applyTextEdits(mupdf, open(), [])).toThrow(/Choose some text/);
  });
});
