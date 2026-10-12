import { describe, expect, it } from "vitest";
import { validateFile, validateFileCount } from "./files";

const file = (bytes: number, name = "a.pdf", type = "application/pdf") =>
  new File([new Uint8Array(bytes)], name, { type });

describe("validateFile", () => {
  it("accepts a normal PDF", () => {
    expect(() => validateFile(file(10))).not.toThrow();
  });

  it("rejects empty, wrong-type and oversized files", () => {
    expect(() => validateFile(file(0))).toThrow(/empty/);
    expect(() => validateFile(file(10, "a.txt", "text/plain"))).toThrow(/supported file type/);
    expect(() => validateFile(file(11), { maxSizeBytes: 10 })).toThrow(/larger than/);
  });

  it("honours a custom accept list", () => {
    expect(() => validateFile(file(10, "a.png", "image/png"), { accept: ["image/png"] })).not.toThrow();
  });
});

describe("validateFileCount", () => {
  it("allows up to the max and rejects beyond", () => {
    expect(() => validateFileCount(18, 2, 20)).not.toThrow();
    expect(() => validateFileCount(18, 3, 20)).toThrow(/up to 20/);
  });
});
