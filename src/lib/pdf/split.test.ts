import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { makePdf, pageWidths } from "@/test/fixtures";
import { splitPdf } from "./split";

async function source(pages: number) {
  return PDFDocument.load(await (await makePdf(pages)).arrayBuffer());
}

describe("splitPdf", () => {
  it("extracts a range into one file, in listed order", async () => {
    const out = await splitPdf(await source(7), "doc", { type: "range", ranges: "5, 1-2" });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("doc_extracted.pdf");
    expect(await pageWidths(out[0].bytes)).toEqual([104, 100, 101]);
  });

  it("splits every page", async () => {
    const out = await splitPdf(await source(3), "doc", { type: "every-page" });
    expect(out.map((o) => o.name)).toEqual(["doc_page-1.pdf", "doc_page-2.pdf", "doc_page-3.pdf"]);
  });

  it("splits into fixed-size chunks with a short last file", async () => {
    const out = await splitPdf(await source(7), "doc", { type: "chunks", size: 3 });
    const counts = await Promise.all(out.map(async (o) => (await pageWidths(o.bytes)).length));
    expect(counts).toEqual([3, 3, 1]);
  });

  it("rejects splitting a single page", async () => {
    await expect(splitPdf(await source(1), "doc", { type: "every-page" })).rejects.toThrow(/one page/);
  });

  it.each([0, 7])("rejects chunk size %i", async (size) => {
    await expect(splitPdf(await source(7), "doc", { type: "chunks", size })).rejects.toThrow();
  });
});
