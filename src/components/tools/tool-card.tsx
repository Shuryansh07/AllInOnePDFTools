import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/types/tool";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon;
  const available = tool.status === "available";

  const card = (
    <Card className={cn("h-full transition-colors", available ? "hover:bg-muted/50" : "opacity-60")}>
      <CardHeader>
        <Icon className="mb-2 size-8" aria-hidden />
        <CardTitle className="flex items-center gap-2">
          {tool.name}
          {!available && <Badge variant="secondary">Soon</Badge>}
        </CardTitle>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (!available) return <div aria-disabled>{card}</div>;
  return (
    <Link href={`/${tool.slug}`} className="block">
      {card}
    </Link>
  );
}
