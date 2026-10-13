import { inflateSync } from "node:zlib";
import { PDFDocument, degrees } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { makePng } from "@/test/fixtures";
import {
  applyEdits,
  displaySize,
  displayToPdf,
  normalizeRotation,
  type EditElement,
  type PageGeometry,
  type Rotation,
} from "./edit";

const geometry = (rotation: Rotation): PageGeometry => ({ x: 0, y: 0, width: 200, height: 100, rotation });

describe("normalizeRotation", () => {
  it("normalises to 0/90/180/270", () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(45)).toBe(0);
  });
});

describe("displaySize", () => {
  it("swaps width and height for sideways pages", () => {
    expect(displaySize(geometry(0))).toEqual({ width: 200, height: 100 });
    expect(displaySize(geometry(90))).toEqual({ width: 100, height: 200 });
    expect(displaySize(geometry(180))).toEqual({ width: 200, height: 100 });
    expect(displaySize(geometry(270))).toEqual({ width: 100, height: 200 });
  });
});

describe("displayToPdf", () => {
  it("maps the display top-left to the right PDF corner for every rotation", () => {
    // Where the top-left of what the user SEES lies in unrotated PDF space.
    expect(displayToPdf(0, 0, geometry(0))).toEqual({ x: 0, y: 100 });
    expect(displayToPdf(0, 0, geometry(90))).toEqual({ x: 0, y: 0 });
    expect(displayToPdf(0, 0, geometry(180))).toEqual({ x: 200, y: 0 });
    expect(displayToPdf(0, 0, geometry(270))).toEqual({ x: 200, y: 100 });
  });

  it("respects a crop box offset", () => {
    const offset: PageGeometry = { x: 10, y: 20, width: 200, height: 100, rotation: 0 };
    expect(displayToPdf(0, 1, offset)).toEqual({ x: 10, y: 20 }); // bottom-left of the visible area
  });

  // Independent check of the sign conventions: an element drawn with rotate=r must read
  // left-to-right and bottom-to-top on screen, i.e. "right" maps to +u and "up" maps to -v.
  it.each([0, 90, 180, 270] as const)("keeps drawn content upright on a page rotated %i", (rotation) => {
    const g = geometry(rotation);
    const r = (rotation * Math.PI) / 180;

    // Local x/y axes of an element drawn with a counter-clockwise rotation of `rotation`.
    const right = { x: Math.cos(r), y: Math.sin(r) };
    const up = { x: -Math.sin(r), y: Math.cos(r) };

    // Convert PDF-space directions to display space by differencing two mapped points.
    const origin = displayToPdf(0.5, 0.5, g);
    const eps = 1e-3;
    const du = (dir: { x: number; y: number }) => {
      // Solve for the display delta whose PDF image equals `dir * eps`.
      const candidates = [
        { u: eps, v: 0 },
        { u: -eps, v: 0 },
        { u: 0, v: eps },
        { u: 0, v: -eps },
      ];
      return candidates.find((c) => {
        const p = displayToPdf(0.5 + c.u, 0.5 + c.v, g);
        const dx = p.x - origin.x;
        const dy = p.y - origin.y;
        // Compare directions (scale differs by page aspect ratio).
        return Math.abs(dx * dir.y - dy * dir.x) < 1e-6 && dx * dir.x + dy * dir.y > 0;
      });
    };

    expect(du(right)).toEqual({ u: eps, v: 0 }); // reads left-to-right
    expect(du(up)).toEqual({ u: 0, v: -eps }); // up on the element is up on screen
  });
});

async function pdfWithPage(rotation: Rotation = 0, size: [number, number] = [200, 100]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage(size);
  page.setRotation(degrees(rotation));
  return new File([(await doc.save()) as BlobPart], "t.pdf", { type: "application/pdf" });
}

const hex = (text: string) => Buffer.from(text, "latin1").toString("hex").toUpperCase();
/** All page content as text: raw bytes plus every Flate stream inflated (pdf-lib compresses them). */
function contentOf(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes);
  const parts: string[] = [raw.toString("latin1")];
  let from = 0;
  for (;;) {
    const start = raw.indexOf("stream", from, "latin1");
    if (start === -1) break;
    const end = raw.indexOf("endstream", start + 6, "latin1");
    if (end === -1) break;
    let bodyStart = start + 6;
    if (raw[bodyStart] === 0x0d) bodyStart++;
    if (raw[bodyStart] === 0x0a) bodyStart++;
    try {
      parts.push(inflateSync(raw.subarray(bodyStart, end)).toString("latin1"));
    } catch {
      /* not a Flate stream (e.g. an image); skip */
    }
    from = end + 9;
  }
  return parts.join("\n");
}

describe("applyEdits", () => {
  it("requires at least one edit", async () => {
    await expect(applyEdits(await pdfWithPage(), [])).rejects.toThrow(/Add some text/);
  });

  it("adds text, a rectangle and an image without changing the page count", async () => {
    const png = makePng(40, 20);
    const elements: EditElement[] = [
      { id: "t", kind: "text", page: 0, u: 0.1, v: 0.1, text: "Hello PDF", fontSize: 14, color: "#ff0000" },
      { id: "r", kind: "rect", page: 0, u: 0.5, v: 0.5, w: 0.2, h: 0.2, color: "#ffff00", opacity: 0.5 },
      {
        id: "i",
        kind: "image",
        page: 0,
        u: 0.6,
        v: 0.1,
        w: 0.2,
        h: 0.2,
        bytes: new Uint8Array(await png.arrayBuffer()),
        mime: "image/png",
        naturalWidth: 40,
        naturalHeight: 20,
      },
    ];

    const before = await pdfWithPage();
    const out = await applyEdits(before, elements);

    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
    expect(out.length).toBeGreaterThan(before.size);
    // Text is written as a hex string in the page content stream.
    expect(contentOf(out).toUpperCase()).toContain(hex("Hello PDF"));
  });

  it("works on rotated pages", async () => {
    for (const rotation of [90, 180, 270] as const) {
      const out = await applyEdits(await pdfWithPage(rotation), [
        { id: "t", kind: "text", page: 0, u: 0.2, v: 0.2, text: "Rotated", fontSize: 12, color: "#000000" },
      ]);
      const page = (await PDFDocument.load(out)).getPage(0);
      expect(page.getRotation().angle).toBe(rotation); // the page itself is untouched
    }
  });

  it("draws multi-line text one line at a time", async () => {
    const out = await applyEdits(await pdfWithPage(), [
      { id: "t", kind: "text", page: 0, u: 0.1, v: 0.1, text: "First\n\nThird", fontSize: 10, color: "#000000" },
    ]);
    const content = contentOf(out).toUpperCase();
    expect(content).toContain(hex("First"));
    expect(content).toContain(hex("Third"));
  });

  it("reports unsupported characters with the page number", async () => {
    await expect(
      applyEdits(await pdfWithPage(), [
        { id: "t", kind: "text", page: 0, u: 0, v: 0, text: "日本語", fontSize: 12, color: "#000000" },
      ]),
    ).rejects.toThrow(/Page 1: this text contains characters/);
  });

  it("ignores elements that point at a page that doesn't exist", async () => {
    const out = await applyEdits(await pdfWithPage(), [
      { id: "t", kind: "text", page: 5, u: 0, v: 0, text: "x", fontSize: 12, color: "#000000" },
    ]);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });
});
