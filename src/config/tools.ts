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
import type { ToolCategory, ToolDefinition } from "@/types/tool";

export const categories: ToolCategory[] = [
  { id: "organize", label: "Organize", description: "Merge, split and arrange pages" },
  { id: "convert", label: "Convert", description: "Turn other files into PDF" },
  { id: "optimize", label: "Optimize", description: "Make PDFs smaller" },
  { id: "secure", label: "Secure", description: "Add or remove passwords" },
];

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
    category: "organize",
    status: "available",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Separate one page or a whole set into independent PDFs.",
    icon: Scissors,
    category: "organize",
    status: "available",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate pages to the orientation you need.",
    icon: RotateCw,
    category: "organize",
    status: "available",
  },
  {
    slug: "delete-pages",
    name: "Delete pages",
    description: "Remove unwanted pages from a PDF.",
    icon: FileMinus2,
    category: "organize",
    status: "available",
  },
  {
    slug: "reorder-pages",
    name: "Reorder pages",
    description: "Drag pages into the order you want.",
    icon: ListOrdered,
    category: "organize",
    status: "available",
  },
  {
    slug: "image-to-pdf",
    name: "Image to PDF",
    description: "Turn JPG and PNG images into a PDF.",
    icon: FileImage,
    category: "convert",
    status: "available",
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce file size while keeping quality.",
    icon: Shrink,
    category: "optimize",
    status: "available",
  },
  {
    slug: "protect-pdf",
    name: "Protect PDF",
    description: "Encrypt a PDF with a password (AES-256).",
    icon: Lock,
    category: "secure",
    status: "available",
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    description: "Remove the password from a PDF you have the password for.",
    icon: LockOpen,
    category: "secure",
    status: "available",
  },
];

export function getTool(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}
