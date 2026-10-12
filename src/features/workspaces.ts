import type { ComponentType } from "react";
import { CompressPdfWorkspace } from "@/features/compress-pdf/compress-pdf-workspace";
import { DeletePagesWorkspace } from "@/features/delete-pages/delete-pages-workspace";
import { ImageToPdfWorkspace } from "@/features/image-to-pdf/image-to-pdf-workspace";
import { MergePdfWorkspace } from "@/features/merge-pdf/merge-pdf-workspace";
import { ProtectPdfWorkspace } from "@/features/protect-pdf/protect-pdf-workspace";
import { ReorderPagesWorkspace } from "@/features/reorder-pages/reorder-pages-workspace";
import { RotatePdfWorkspace } from "@/features/rotate-pdf/rotate-pdf-workspace";
import { SplitPdfWorkspace } from "@/features/split-pdf/split-pdf-workspace";
import { UnlockPdfWorkspace } from "@/features/unlock-pdf/unlock-pdf-workspace";

/** Maps a tool slug to its interactive workspace. Add new tools here and in config/tools.ts. */
export const workspaces: Record<string, ComponentType> = {
  "merge-pdf": MergePdfWorkspace,
  "split-pdf": SplitPdfWorkspace,
  "rotate-pdf": RotatePdfWorkspace,
  "delete-pages": DeletePagesWorkspace,
  "reorder-pages": ReorderPagesWorkspace,
  "image-to-pdf": ImageToPdfWorkspace,
  "compress-pdf": CompressPdfWorkspace,
  "protect-pdf": ProtectPdfWorkspace,
  "unlock-pdf": UnlockPdfWorkspace,
};
