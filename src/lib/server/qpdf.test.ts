import { readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_BYTES, protectPdf, unlockPdf, type QpdfRunner } from "./qpdf";

interface Job {
  inputFile: string;
  outputFile: string;
  password?: string;
  decrypt?: string;
  encrypt?: { userPassword: string; ownerPassword: string; "256bit": object };
}

/** Fake qpdf: reads the job JSON, records it, and writes some output. */
function fakeRunner(seen: { jobs: Job[]; args: string[][] }, outputBytes = 8): QpdfRunner {
  return async (args) => {
    seen.args.push(args);
    const jobPath = args[0].slice("--job-json-file=".length);
    const job = JSON.parse(await readFile(jobPath, "utf8")) as Job;
    seen.jobs.push(job);
    await writeFile(job.outputFile, Buffer.alloc(outputBytes, 1));
  };
}

async function tempDirCount(): Promise<number> {
  return (await readdir(tmpdir())).filter((name) => name.startsWith("pdfq-")).length;
}

describe("protectPdf", () => {
  it("encrypts with AES-256 and a random owner password", async () => {
    const seen = { jobs: [] as Job[], args: [] as string[][] };
    await protectPdf(Buffer.alloc(10), "s3cret", { run: fakeRunner(seen) });
    await protectPdf(Buffer.alloc(10), "s3cret", { run: fakeRunner(seen) });

    const [first, second] = seen.jobs;
    expect(first.encrypt?.userPassword).toBe("s3cret");
    expect(first.encrypt?.["256bit"]).toEqual({});
    expect(first.encrypt?.ownerPassword).toMatch(/^[0-9a-f]{48}$/);
    expect(first.encrypt?.ownerPassword).not.toBe(second.encrypt?.ownerPassword);
  });

  it("keeps passwords off the command line", async () => {
    const seen = { jobs: [] as Job[], args: [] as string[][] };
    await protectPdf(Buffer.alloc(10), "very-secret-value", { run: fakeRunner(seen) });
    expect(seen.args).toHaveLength(1);
    expect(seen.args[0].join(" ")).not.toContain("very-secret-value");
  });

  it("requires a password and enforces the byte limit", async () => {
    await expect(protectPdf(Buffer.alloc(1), "")).rejects.toMatchObject({ code: "PASSWORD_REQUIRED" });
    await expect(protectPdf(Buffer.alloc(1), "x".repeat(MAX_PASSWORD_BYTES + 1))).rejects.toMatchObject({
      code: "PROCESSING_FAILED",
    });
    // Multi-byte characters count by bytes, not characters.
    await expect(protectPdf(Buffer.alloc(1), "é".repeat(64))).rejects.toMatchObject({
      code: "PROCESSING_FAILED",
    });
  });
});

describe("unlockPdf", () => {
  it("passes the password and requests decryption", async () => {
    const seen = { jobs: [] as Job[], args: [] as string[][] };
    const output = await unlockPdf(Buffer.alloc(10), "  spaced pw  ", { run: fakeRunner(seen, 5) });
    expect(seen.jobs[0].password).toBe("  spaced pw  ");
    expect(seen.jobs[0].decrypt).toBe("");
    expect(output.length).toBe(5);
  });

  it("propagates an incorrect-password error and cleans up temp files", async () => {
    const before = await tempDirCount();
    const { AppError, ERROR_CODES } = await import("@/lib/errors/app-error");
    await expect(
      unlockPdf(Buffer.alloc(10), "nope", {
        run: async () => {
          throw new AppError(ERROR_CODES.INVALID_PASSWORD);
        },
      }),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
    expect(await tempDirCount()).toBe(before);
  });

  it("fails when qpdf produced no output", async () => {
    await expect(
      unlockPdf(Buffer.alloc(10), "pw", { run: async () => {} }),
    ).rejects.toMatchObject({ code: "PROCESSING_FAILED" });
  });
});
