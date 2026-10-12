import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError, ERROR_CODES } from "@/lib/errors/app-error";

/** AES-256 (R6) only uses the first 127 bytes of a password. */
export const MAX_PASSWORD_BYTES = 127;

export function qpdfBinary(): string {
  return process.env.QPDF_PATH ?? "qpdf";
}

export type QpdfMode = "protect" | "unlock";

/** Runs qpdf with the given arguments. Injectable for tests. */
export type QpdfRunner = (args: string[], timeoutMs: number, mode: QpdfMode) => Promise<void>;

const defaultRunner: QpdfRunner = (args, timeoutMs, mode) =>
  new Promise((resolve, reject) => {
    // The binary is a system executable, not a project file, so don't trace the project for it.
    execFile(
      /* turbopackIgnore: true */ qpdfBinary(),
      args,
      { timeout: timeoutMs, windowsHide: true },
      (error, _stdout, stderr) => {
        if (!error) return resolve();

        const failure = error as NodeJS.ErrnoException & { killed?: boolean };

        if (failure.code === "ENOENT") {
          return reject(
            new AppError(ERROR_CODES.PROCESSING_FAILED, {
              userMessage: "This tool isn't available on this server right now.",
              message: "qpdf binary not found. Install it or set QPDF_PATH.",
              cause: error,
              recoverable: false,
            }),
          );
        }
        if (failure.killed) {
          return reject(new AppError(ERROR_CODES.TIMEOUT, { cause: error }));
        }
        // qpdf exits 3 when it succeeded with warnings; the output file is still valid.
        if (typeof failure.code === "number" && failure.code === 3) return resolve();

        const output = stderr?.toString() ?? "";
        if (/invalid password/i.test(output)) {
          return reject(
            mode === "unlock"
              ? new AppError(ERROR_CODES.INVALID_PASSWORD)
              : new AppError(ERROR_CODES.ENCRYPTED_PDF, {
                  userMessage: "This PDF is already password protected. Unlock it first.",
                }),
          );
        }

        reject(
          new AppError(ERROR_CODES.PROCESSING_FAILED, {
            userMessage: "This PDF couldn't be processed. It may be damaged.",
            // Never include args in logs: they reference files that hold the password.
            message: `qpdf failed: ${output.slice(0, 300)}`,
            cause: error,
          }),
        );
      },
    );
  });

export interface QpdfOptions {
  timeoutMs?: number;
  run?: QpdfRunner;
}

/**
 * Run qpdf with a job-JSON file. Passwords go through the JSON file, never the command line,
 * so they aren't visible in the process list, and arbitrary characters need no quoting.
 */
async function runJob(
  input: Buffer,
  mode: QpdfMode,
  buildJob: (paths: { input: string; output: string }) => Record<string, unknown>,
  { timeoutMs = 60_000, run = defaultRunner }: QpdfOptions,
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "pdfq-"));
  const inputPath = path.join(dir, `${randomUUID()}-in.pdf`);
  const outputPath = path.join(dir, `${randomUUID()}-out.pdf`);
  const jobPath = path.join(dir, `${randomUUID()}-job.json`);

  try {
    await writeFile(inputPath, input);
    await writeFile(jobPath, JSON.stringify(buildJob({ input: inputPath, output: outputPath })), {
      mode: 0o600,
    });

    await run([`--job-json-file=${jobPath}`], timeoutMs, mode);

    const info = await stat(outputPath).catch(() => null);
    if (!info || info.size === 0) {
      throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
        userMessage: "This PDF couldn't be processed. It may be damaged.",
      });
    }
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function assertPassword(password: string): void {
  if (password.length === 0) {
    throw new AppError(ERROR_CODES.PASSWORD_REQUIRED);
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new AppError(ERROR_CODES.PROCESSING_FAILED, {
      userMessage: `Passwords can be at most ${MAX_PASSWORD_BYTES} bytes long (fewer characters if you use accents or symbols).`,
    });
  }
}

/** Encrypt with AES-256. The owner password is random and discarded; only the open password matters. */
export async function protectPdf(input: Buffer, password: string, options: QpdfOptions = {}): Promise<Buffer> {
  assertPassword(password);
  const ownerPassword = randomBytes(24).toString("hex");

  return await runJob(
    input,
    "protect",
    ({ input: inputFile, output }) => ({
      inputFile,
      outputFile: output,
      encrypt: { userPassword: password, ownerPassword, "256bit": {} },
    }),
    options,
  );
}

/** Remove password protection using the given password. */
export async function unlockPdf(input: Buffer, password: string, options: QpdfOptions = {}): Promise<Buffer> {
  assertPassword(password);

  return await runJob(
    input,
    "unlock",
    ({ input: inputFile, output }) => ({
      inputFile,
      outputFile: output,
      password,
      decrypt: "",
    }),
    options,
  );
}
