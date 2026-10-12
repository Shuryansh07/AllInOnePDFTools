import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
import { makePdf, pageWidths } from "@/test/fixtures";
import { mergePdfs } from "./merge";

describe("mergePdfs", () => {
  it("concatenates pages in file order", async () => {
    const bytes = await mergePdfs([await makePdf(2), await makePdf(3)]);
    expect(await pageWidths(bytes)).toEqual([100, 101, 100, 101, 102]);
  });

  it("requires at least two files", async () => {
    await expect(mergePdfs([await makePdf(1)])).rejects.toMatchObject({ code: "TOO_FEW_FILES" });
  });

  it("names the corrupt file", async () => {
    const bad = new File(["not a pdf"], "bad.pdf", { type: "application/pdf" });
    const error = await mergePdfs([await makePdf(1), bad]).catch((e) => e);
    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ code: "CORRUPT_PDF" });
    expect(error.userMessage).toContain("bad.pdf");
  });
});
