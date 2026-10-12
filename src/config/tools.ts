import {
  FileImage,
  FileMinus2,
  ListOrdered,
  Lock,
  LockOpen,
  Merge,
  RotateCw,
  Scissors,
  Shrink,
} from "lucide-react";
import type { ToolDefinition } from "@/types/tool";

/**
 * Single source of truth for tools. The homepage grid, routes and
 * navigation are derived from this list; adding a tool starts here.
 */
export const tools: ToolDefinition[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one document.",
    icon: Merge,
    status: "available",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Separate one page or a whole set into independent PDFs.",
    icon: Scissors,
    status: "available",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate pages to the orientation you need.",
    icon: RotateCw,
    status: "available",
  },
  {
    slug: "delete-pages",
    name: "Delete pages",
    description: "Remove unwanted pages from a PDF.",
    icon: FileMinus2,
    status: "available",
  },
  {
    slug: "reorder-pages",
    name: "Reorder pages",
    description: "Drag pages into the order you want.",
    icon: ListOrdered,
    status: "available",
  },
  {
    slug: "image-to-pdf",
    name: "Image to PDF",
    description: "Turn JPG and PNG images into a PDF.",
    icon: FileImage,
    status: "available",
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce file size while keeping quality.",
    icon: Shrink,
    status: "available",
  },
  {
    slug: "protect-pdf",
    name: "Protect PDF",
    description: "Encrypt a PDF with a password (AES-256).",
    icon: Lock,
    status: "available",
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    description: "Remove the password from a PDF you have the password for.",
    icon: LockOpen,
    status: "available",
  },
];

export function getTool(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}
