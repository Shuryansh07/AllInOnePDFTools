export const siteConfig = {
  name: "PDF Parser",
  description:
    "Free online PDF tools. Merge, split, compress and convert PDF files right in your browser.",
  /**
   * Public origin, used for canonical URLs, Open Graph, the sitemap and robots.txt.
   * Set SITE_URL at build time (e.g. https://pdfparser.example.com).
   */
  url: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** Shown on the privacy page when set. Provide via CONTACT_EMAIL at build time. */
  contactEmail: process.env.CONTACT_EMAIL ?? "",
} as const;
