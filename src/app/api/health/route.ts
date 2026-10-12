import { connection } from "next/server";
import { checkHealth } from "@/lib/server/health";

/**
 * Liveness/readiness probe. Returns 200 when the app and its PDF binaries work,
 * 503 when a binary is missing (so orchestrators stop routing traffic to a broken instance).
 */
export async function GET() {
  await connection();

  const report = await checkHealth();
  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
