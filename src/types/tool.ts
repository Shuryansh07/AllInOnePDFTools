import type { LucideIcon } from "lucide-react";

export type ToolStatus = "available" | "coming-soon";

export type ToolCategoryId = "organize" | "convert" | "optimize" | "secure";

export interface ToolCategory {
  id: ToolCategoryId;
  label: string;
  description: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategoryId;
  status: ToolStatus;
}

/** Lifecycle shared by every tool workspace. */
export type ToolState = "idle" | "ready" | "processing" | "done" | "error";
