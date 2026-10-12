import { Gift, Lock, Zap } from "lucide-react";
import { ToolBrowser } from "@/components/home/tool-browser";
import { siteConfig } from "@/config/site";
import { absoluteUrl, serializeJsonLd } from "@/lib/seo";

const highlights = [
  {
    icon: Lock,
    title: "Private by design",
    text: "Most tools run in your browser, so your files never leave your device. Server tools delete files right after processing.",
  },
  {
    icon: Gift,
    title: "Free, no sign-up",
    text: "Open a tool, drop in a file, download the result. No account or watermark.",
  },
  {
    icon: Zap,
    title: "Fast and simple",
    text: "Every tool does one job and shows exactly what will happen before you run it.",
  },
];

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: absoluteUrl("/"),
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
      />
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Every tool you need to work with PDFs
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground text-balance">
            {siteConfig.description}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <ToolBrowser />
      </div>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
