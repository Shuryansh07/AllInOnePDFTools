"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";
import { Input } from "@/components/ui/input";
import { categories, tools } from "@/config/tools";
import { cn } from "@/lib/utils";
import type { ToolCategoryId, ToolDefinition } from "@/types/tool";

type Filter = "all" | ToolCategoryId;

function matches(tool: ToolDefinition, query: string): boolean {
  const haystack = `${tool.name} ${tool.description} ${tool.slug.replace(/-/g, " ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function ToolBrowser() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const searching = query.trim().length > 0;

  const results = useMemo(
    () => tools.filter((tool) => matches(tool, query) && (filter === "all" || tool.category === filter)),
    [query, filter],
  );

  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          tools: results.filter((tool) => tool.category === category.id),
        }))
        .filter((group) => group.tools.length > 0),
    [results],
  );

  return (
    <div>
      <div className="mx-auto max-w-xl">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, e.g. merge, compress, password…"
            aria-label="Search tools"
            className="h-11 pl-9"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by category">
        {[{ id: "all" as const, label: "All tools" }, ...categories].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              filter === option.id
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-10" aria-live="polite">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <SearchX className="size-8" aria-hidden />
            <p className="font-medium text-foreground">No tools match “{query.trim()}”</p>
            <p className="text-sm">Try a different word, like “merge”, “compress” or “password”.</p>
          </div>
        ) : searching ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((tool) => (
              <li key={tool.slug}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        ) : (
          groups.map(({ category, tools: groupTools }) => (
            <section key={category.id} id={category.id} className="scroll-mt-20">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{category.label}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupTools.map((tool) => (
                  <li key={tool.slug}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
