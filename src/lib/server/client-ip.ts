/**
 * Work out the caller's IP for rate limiting.
 *
 * Behind a reverse proxy the TCP peer is always the proxy, so the real client IP only
 * arrives in a header, and a header is only trustworthy if *your* proxy sets it.
 *
 *   TRUSTED_PROXY_HEADER  Header holding the client IP. Default "x-forwarded-for".
 *                         Use "cf-connecting-ip" behind Cloudflare, "x-real-ip" behind
 *                         nginx configured to set it, etc.
 *   TRUSTED_PROXY_HOPS    For x-forwarded-for only: how many proxies you run in front of
 *                         the app. Default 1. Each proxy appends the address it saw, so
 *                         the real client is that many entries from the RIGHT. Entries
 *                         further left are supplied by the client and can be forged.
 */
export function clientIp(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string {
  const name = (env.TRUSTED_PROXY_HEADER ?? "x-forwarded-for").toLowerCase();
  const raw = headers.get(name);
  if (!raw) return "unknown";

  if (name !== "x-forwarded-for") return raw.trim() || "unknown";

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return "unknown";

  const parsed = Number(env.TRUSTED_PROXY_HOPS ?? 1);
  const hops = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;

  // Fewer entries than hops means fewer proxies than configured; fall back to the leftmost.
  return entries[Math.max(0, entries.length - hops)];
}
