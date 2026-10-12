import { readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  buildGhostscriptArgs,
  compressPdf,
  isCompressionPreset,
  type GhostscriptRunner,
} from "./ghostscript";
import { ConcurrencyGate, RateLimiter } from "./limiter";

/** A fake gs that writes `size` bytes to the -sOutputFile path. */
function fakeRunner(size: number): GhostscriptRunner {
  return async (args) => {
    const output = args.find((arg) => arg.startsWith("-sOutputFile="))!.slice("-sOutputFile=".length);
    await writeFile(output, Buffer.alloc(size, 1));
  };
}

async function tempDirCount(): Promise<number> {
  return (await readdir(tmpdir())).filter((name) => name.startsWith("pdfc-")).length;
}

describe("buildGhostscriptArgs", () => {
  it("maps presets and keeps paths as separate arguments", () => {
    const args = buildGhostscriptArgs("extreme", "/in.pdf", "/out.pdf");
    expect(args).toContain("-dPDFSETTINGS=/screen");
    expect(args).toContain("-sOutputFile=/out.pdf");
    expect(args.at(-1)).toBe("/in.pdf");
    expect(args).toContain("-dSAFER");
  });

  it("validates preset names", () => {
    expect(isCompressionPreset("recommended")).toBe(true);
    expect(isCompressionPreset("toString")).toBe(false);
    expect(isCompressionPreset(undefined)).toBe(false);
  });
});

describe("compressPdf", () => {
  it("returns the compressed output when it's smaller", async () => {
    const result = await compressPdf(Buffer.alloc(1000), "recommended", { run: fakeRunner(400) });
    expect(result.unchanged).toBe(false);
    expect(result.bytes.length).toBe(400);
  });

  it("returns the original when compression doesn't help", async () => {
    const input = Buffer.alloc(1000, 7);
    const result = await compressPdf(input, "low", { run: fakeRunner(1500) });
    expect(result.unchanged).toBe(true);
    expect(result.bytes).toBe(input);
  });

  it("fails when gs produced no output, and still cleans up", async () => {
    const before = await tempDirCount();
    await expect(
      compressPdf(Buffer.alloc(10), "low", { run: async () => {} }),
    ).rejects.toMatchObject({ code: "PROCESSING_FAILED" });
    expect(await tempDirCount()).toBe(before);
  });

  it("propagates runner errors and cleans up", async () => {
    const before = await tempDirCount();
    await expect(
      compressPdf(Buffer.alloc(10), "low", {
        run: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");
    expect(await tempDirCount()).toBe(before);
  });
});

describe("RateLimiter", () => {
  it("allows up to max per window, then recovers", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 100)).toBe(true);
    expect(limiter.allow("a", 200)).toBe(false);
    expect(limiter.allow("b", 200)).toBe(true);
    expect(limiter.allow("a", 1500)).toBe(true);
  });
});

describe("ConcurrencyGate", () => {
  it("caps concurrent jobs and frees slots on release", () => {
    const gate = new ConcurrencyGate(1);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.tryAcquire()).toBe(false);
    gate.release();
    expect(gate.tryAcquire()).toBe(true);
  });
});
