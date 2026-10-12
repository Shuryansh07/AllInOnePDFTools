import type { Metadata } from "next";
import { getTool } from "@/config/tools";
import { ReorderPagesWorkspace } from "@/features/reorder-pages/reorder-pages-workspace";

const tool = getTool("reorder-pages")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function ReorderPagesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        {tool.description} Files never leave your browser.
      </p>
      <ReorderPagesWorkspace />
    </div>
  );
}
