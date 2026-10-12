import type { Metadata } from "next";
import { getTool } from "@/config/tools";
import { RotatePdfWorkspace } from "@/features/rotate-pdf/rotate-pdf-workspace";

const tool = getTool("rotate-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function RotatePdfPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        {tool.description} Files never leave your browser.
      </p>
      <RotatePdfWorkspace />
    </div>
  );
}
