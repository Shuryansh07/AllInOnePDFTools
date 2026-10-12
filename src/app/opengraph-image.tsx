import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          padding: 80,
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 44, color: "#a3a3a3", lineHeight: 1.3 }}>
          Every tool you need to work with PDFs. Merge, split, compress, protect and more.
        </div>
        <div style={{ fontSize: 30, color: "#a3a3a3" }}>Free · No sign-up · Private by design</div>
      </div>
    ),
    size,
  );
}
