import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import type { ToolContent } from "@/config/tool-content";
import type { ToolDefinition } from "@/types/tool";

export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Per-tool <head> metadata: title, description, canonical, Open Graph and Twitter card. */
export function toolMetadata(tool: ToolDefinition, content: ToolContent): Metadata {
  const path = `/${tool.slug}`;

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: `${content.metaTitle} | ${siteConfig.name}`,
      description: content.metaDescription,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: `${content.metaTitle} | ${siteConfig.name}`,
      description: content.metaDescription,
    },
  };
}

/** JSON-LD for a tool page: the web app itself, its FAQ, and a breadcrumb trail. */
export function toolJsonLd(tool: ToolDefinition, content: ToolContent) {
  const url = absoluteUrl(`/${tool.slug}`);

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      description: content.metaDescription,
      url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: tool.name, item: url },
      ],
    },
  ];
}

/** Serialize JSON-LD safely for inline <script>: escape "<" so content can't close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
