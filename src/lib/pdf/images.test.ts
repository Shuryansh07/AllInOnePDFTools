import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { makePng } from "@/test/fixtures";
import { imagesToPdf } from "./images";

async function sizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
}

describe("imagesToPdf", () => {
  const files = () => [makePng(400, 200), makePng(200, 400)];

  it("orients A4 pages to each image", async () => {
    const bytes = await imagesToPdf(files(), { pageSize: "a4", margin: "small" });
    expect(await sizes(bytes)).toEqual([[842, 595], [595, 842]]);
  });

  it("uses Letter dimensions", async () => {
    const bytes = await imagesToPdf(files(), { pageSize: "letter", margin: "none" });
    expect(await sizes(bytes)).toEqual([[792, 612], [612, 792]]);
  });

  it("fits the page to the image (px to pt)", async () => {
    const bytes = await imagesToPdf(files(), { pageSize: "fit", margin: "none" });
    expect(await sizes(bytes)).toEqual([[300, 150], [150, 300]]);
  });

  it("rejects empty input and unreadable images", async () => {
    await expect(imagesToPdf([], { pageSize: "a4", margin: "none" })).rejects.toThrow(/at least one image/);
    const bad = new File(["junk"], "bad.png", { type: "image/png" });
    await expect(imagesToPdf([bad], { pageSize: "a4", margin: "none" })).rejects.toThrow(/bad\.png/);
  });
});
