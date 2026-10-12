import { ToolCard } from "@/components/tools/tool-card";
import { siteConfig } from "@/config/site";
import { tools } from "@/config/tools";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Every tool you need to work with PDFs</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{siteConfig.description}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </section>
    </div>
  );
}
