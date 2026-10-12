import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/tools/tool-page";
import { getToolContent } from "@/config/tool-content";
import { getTool } from "@/config/tools";
import { workspaces } from "@/features/workspaces";
import { toolMetadata } from "@/lib/seo";

/**
 * Each tool has its own static route folder (app/(tools)/<slug>/page.tsx) so unknown URLs
 * return a real 404 immediately. These helpers keep every one of those pages to a few lines.
 */

export function toolRouteMetadata(slug: string): Metadata {
  const tool = getTool(slug);
  const content = getToolContent(slug);
  if (!tool || !content) throw new Error(`No tool registered for slug "${slug}"`);
  return toolMetadata(tool, content);
}

export function ToolRoute({ slug }: { slug: string }) {
  const tool = getTool(slug);
  const content = getToolContent(slug);
  const Workspace = workspaces[slug];

  if (!tool || tool.status !== "available" || !content || !Workspace) notFound();

  return (
    <ToolPage tool={tool} content={content}>
      <Workspace />
    </ToolPage>
  );
}
