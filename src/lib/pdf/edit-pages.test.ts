import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { makePdf, pageWidths } from "@/test/fixtures";
import { deletePages, rotatePages } from "./edit-pages";
import { reorderPages } from "./reorder";

describe("rotatePages", () => {
  it("adds to each page's rotation and normalises to 0-359", async () => {
    const doc = await PDFDocument.load(await rotatePages(await makePdf(4), [90, 0, -90, 450]));
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0, 270, 90]);
  });

  it("rejects a no-op and a wrong-length delta list", async () => {
    await expect(rotatePages(await makePdf(2), [0, 0])).rejects.toThrow(/at least one page/);
    await expect(rotatePages(await makePdf(2), [90])).rejects.toThrow();
  });
});

describe("deletePages", () => {
  it("removes pages and ignores duplicate indices", async () => {
    const bytes = await deletePages(await makePdf(4), [0, 2, 2]);
    expect(await pageWidths(bytes)).toEqual([101, 103]);
  });

  it("refuses to delete nothing or everything", async () => {
    await expect(deletePages(await makePdf(2), [])).rejects.toThrow(/at least one page/);
    await expect(deletePages(await makePdf(2), [0, 1])).rejects.toThrow(/every page/);
  });
});

describe("reorderPages", () => {
  it("applies the new order", async () => {
    const bytes = await reorderPages(await makePdf(3), [2, 0, 1]);
    expect(await pageWidths(bytes)).toEqual([102, 100, 101]);
  });

  it("rejects unchanged order and invalid permutations", async () => {
    await expect(reorderPages(await makePdf(3), [0, 1, 2])).rejects.toThrow(/Move at least one/);
    await expect(reorderPages(await makePdf(3), [0, 0, 1])).rejects.toThrow();
    await expect(reorderPages(await makePdf(3), [0, 1])).rejects.toThrow();
  });
});
