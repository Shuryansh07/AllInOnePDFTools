import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Only honoured by browsers over HTTPS, so it's inert in local HTTP development.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  turbopack: {
    // MuPDF's loader references Node built-ins behind runtime checks. Give the browser build
    // an empty stand-in so they resolve (they are never executed there).
    resolveAlias: {
      module: { browser: "./src/lib/mupdf/empty-module.ts" },
      "node:module": { browser: "./src/lib/mupdf/empty-module.ts" },
      "node:fs": { browser: "./src/lib/mupdf/empty-module.ts" },
      fs: { browser: "./src/lib/mupdf/empty-module.ts" },
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
