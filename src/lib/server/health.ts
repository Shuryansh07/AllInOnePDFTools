import { execFile } from "node:child_process";
import { ghostscriptBinary } from "./ghostscript";
import { qpdfBinary } from "./qpdf";

export interface HealthReport {
  status: "ok" | "degraded";
  tools: { ghostscript: boolean; qpdf: boolean };
}

function runs(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    // System executables, not project files, so don't trace the project for them.
    execFile(/* turbopackIgnore: true */ binary, ["--version"], { timeout: 5000, windowsHide: true }, (error) =>
      resolve(!error),
    );
  });
}

let cached: { at: number; report: HealthReport } | null = null;
const TTL_MS = 30_000;

/** Whether the external binaries the API depends on can actually run. Cached briefly. */
export async function checkHealth(now = Date.now()): Promise<HealthReport> {
  if (cached && now - cached.at < TTL_MS) return cached.report;

  const [ghostscript, qpdf] = await Promise.all([runs(ghostscriptBinary()), runs(qpdfBinary())]);
  const report: HealthReport = {
    status: ghostscript && qpdf ? "ok" : "degraded",
    tools: { ghostscript, qpdf },
  };

  cached = { at: now, report };
  return report;
}
