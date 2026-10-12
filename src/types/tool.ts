import type { LucideIcon } from "lucide-react";

export type ToolStatus = "available" | "coming-soon";

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: ToolStatus;
}

/** Lifecycle shared by every tool workspace. */
export type ToolState = "idle" | "ready" | "processing" | "done" | "error";
