import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toolContent } from "./tool-content";
import { tools } from "./tools";

const appDir = path.resolve(__dirname, "../app/(tools)");

describe("tool registry consistency", () => {
  const available = tools.filter((tool) => tool.status === "available");

  it.each(available.map((tool) => tool.slug))("%s has a route, an OG image and SEO content", (slug) => {
    expect(existsSync(path.join(appDir, slug, "page.tsx")), "page.tsx").toBe(true);
    expect(existsSync(path.join(appDir, slug, "opengraph-image.tsx")), "opengraph-image.tsx").toBe(true);

    const content = toolContent[slug];
    expect(content, "tool-content entry").toBeDefined();
    expect(content.steps.length).toBeGreaterThanOrEqual(3);
    expect(content.faqs.length).toBeGreaterThanOrEqual(3);
    // Search engines truncate around these lengths.
    expect(content.metaDescription.length).toBeLessThanOrEqual(160);
    expect(content.metaTitle.length).toBeLessThanOrEqual(60);
  });

  it("has unique slugs", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
