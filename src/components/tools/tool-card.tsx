import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/types/tool";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon;
  const available = tool.status === "available";

  const content = (
    <div
      className={cn(
        "flex h-full gap-4 rounded-xl border bg-card p-4 text-card-foreground transition-all",
        available
          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          : "opacity-60",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-semibold">
          {tool.name}
          {!available && <Badge variant="secondary">Soon</Badge>}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
      </div>
    </div>
  );

  if (!available) return <div aria-disabled>{content}</div>;

  return (
    <Link
      href={`/${tool.slug}`}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  );
}
