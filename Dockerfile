# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public origin for canonical URLs, sitemap and Open Graph (baked in at build time).
ARG SITE_URL=http://localhost:3000
ARG CONTACT_EMAIL=
ENV SITE_URL=$SITE_URL CONTACT_EMAIL=$CONTACT_EMAIL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Ghostscript compresses PDFs; qpdf encrypts/decrypts them; fonts keep text rendering sane.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ghostscript qpdf fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Run as an unprivileged user.
RUN useradd --system --uid 1001 --create-home app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app

EXPOSE 3000

# Healthy only when the app is up AND Ghostscript and qpdf can run.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
