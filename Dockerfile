# ── Stage 1: build ──────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
# Skip Puppeteer's Chromium download here — the runtime stage uses system Chromium.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production deps only for copying into the runtime stage.
RUN npm prune --omit=dev

# ── Stage 2: runtime ────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app

# System Chromium + the libraries Puppeteer needs to run it headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 4000
CMD ["node", "dist/server.js"]
