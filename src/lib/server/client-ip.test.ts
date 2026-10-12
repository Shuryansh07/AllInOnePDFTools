import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("returns 'unknown' when no header is present", () => {
    expect(clientIp(h({}), {})).toBe("unknown");
  });

  it("uses the rightmost x-forwarded-for entry by default, ignoring client-forged values", () => {
    // Client sent 9.9.9.9; the proxy appended the address it actually saw.
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }), {})).toBe("203.0.113.7");
  });

  it("handles a single entry", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7" }), {})).toBe("203.0.113.7");
  });

  it("honours TRUSTED_PROXY_HOPS for chains of proxies", () => {
    const headers = h({ "x-forwarded-for": "198.51.100.1, 203.0.113.7, 10.0.0.2" });
    expect(clientIp(headers, { TRUSTED_PROXY_HOPS: "2" })).toBe("203.0.113.7");
    expect(clientIp(headers, { TRUSTED_PROXY_HOPS: "3" })).toBe("198.51.100.1");
  });

  it("falls back to the leftmost entry when there are fewer entries than hops", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7" }), { TRUSTED_PROXY_HOPS: "3" })).toBe(
      "203.0.113.7",
    );
  });

  it("ignores invalid hop counts", () => {
    const headers = h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    for (const bad of ["0", "-1", "abc", "1.5", ""]) {
      expect(clientIp(headers, { TRUSTED_PROXY_HOPS: bad })).toBe("2.2.2.2");
    }
  });

  it("reads a single-valued header such as cf-connecting-ip", () => {
    const env = { TRUSTED_PROXY_HEADER: "CF-Connecting-IP" };
    expect(clientIp(h({ "cf-connecting-ip": " 203.0.113.9 ", "x-forwarded-for": "1.2.3.4" }), env)).toBe(
      "203.0.113.9",
    );
  });

  it("does not fall back to x-forwarded-for when a custom header is configured but missing", () => {
    expect(clientIp(h({ "x-forwarded-for": "1.2.3.4" }), { TRUSTED_PROXY_HEADER: "x-real-ip" })).toBe(
      "unknown",
    );
  });
});
