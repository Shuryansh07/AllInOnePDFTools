import type { Metadata } from "next";
import { getTool } from "@/config/tools";
import { ProtectPdfWorkspace } from "@/features/protect-pdf/protect-pdf-workspace";

const tool = getTool("protect-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function ProtectPdfPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
      <p className="mt-2 mb-8 text-muted-foreground">{tool.description}</p>
      <ProtectPdfWorkspace />
    </div>
  );
}
