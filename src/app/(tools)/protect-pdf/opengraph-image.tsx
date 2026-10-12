import { renderToolOgImage } from "@/lib/og/tool-image";

export const alt = "Protect PDF";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderToolOgImage("protect-pdf", size);
}
