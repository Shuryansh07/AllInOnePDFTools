import type { MetadataRoute } from "next";
import { tools } from "@/config/tools";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...tools
      .filter((tool) => tool.status === "available")
      .map((tool) => ({
        url: absoluteUrl(`/${tool.slug}`),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
  ];
}
