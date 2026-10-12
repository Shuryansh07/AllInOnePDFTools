import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getTool } from "@/config/tools";

/** Social-preview card for a tool: 1200x630, dark, with the tool's name and description. */
export function renderToolOgImage(slug: string, size: { width: number; height: number }) {
  const tool = getTool(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 600 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#fafafa",
              color: "#0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            P
          </div>
          {siteConfig.name}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>{tool?.name ?? siteConfig.name}</div>
          <div style={{ fontSize: 38, color: "#a3a3a3", lineHeight: 1.3 }}>
            {tool?.description ?? siteConfig.description}
          </div>
        </div>

        <div style={{ fontSize: 30, color: "#a3a3a3" }}>Free online PDF tools · No sign-up</div>
      </div>
    ),
    size,
  );
}
