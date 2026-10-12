import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createZip } from "./zip";

describe("createZip", () => {
  it("round-trips file names and bytes", () => {
    const zip = createZip([
      { name: "a.pdf", bytes: new Uint8Array([1, 2, 3]) },
      { name: "b.pdf", bytes: new Uint8Array([4]) },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["a.pdf", "b.pdf"]);
    expect([...files["a.pdf"]]).toEqual([1, 2, 3]);
  });
});
