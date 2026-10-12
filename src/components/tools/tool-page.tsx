import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Lock, ShieldCheck } from "lucide-react";
import { categories, tools } from "@/config/tools";
import type { ToolContent } from "@/config/tool-content";
import { serializeJsonLd, toolJsonLd } from "@/lib/seo";
import type { ToolDefinition } from "@/types/tool";

interface ToolPageProps {
  tool: ToolDefinition;
  content: ToolContent;
  children: ReactNode;
}

export function ToolPage({ tool, content, children }: ToolPageProps) {
  const related = tools
    .filter((other) => other.category === tool.category && other.slug !== tool.slug && other.status === "available")
    .slice(0, 3);
  const categoryLabel = categories.find((category) => category.id === tool.category)?.label;
  const PrivacyIcon = content.processing === "browser" ? ShieldCheck : Lock;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {toolJsonLd(tool, content).map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
        />
      ))}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          All tools
        </Link>
        {categoryLabel && (
          <>
            <span aria-hidden> / </span>
            <Link href={`/#${tool.category}`} className="hover:text-foreground">
              {categoryLabel}
            </Link>
          </>
        )}
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-2 text-muted-foreground">{tool.description}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          <PrivacyIcon className="size-3.5" aria-hidden />
          {content.processing === "browser"
            ? "Runs in your browser. Your file never leaves your device."
            : "Processed on our server and deleted immediately afterwards."}
        </p>
      </header>

      {children}

      <section className="mt-16" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-xl font-semibold">
          How to use {tool.name}
        </h2>
        <ol className="mt-4 space-y-3">
          {content.steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-semibold">
          Frequently asked questions
        </h2>
        <div className="mt-4 divide-y rounded-xl border">
          {content.faqs.map((faq) => (
            <details key={faq.question} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="text-xl font-semibold">
            Related tools
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/${other.slug}`}
                  className="block rounded-xl border p-4 transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{other.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{other.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
