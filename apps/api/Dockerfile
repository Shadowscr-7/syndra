# ============================================================
# Dockerfile — API (NestJS 11)
# Multi-stage build: install → build → production
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl netcat-openbsd ffmpeg python3 py3-pip \
    fontconfig font-noto font-noto-emoji ttf-dejavu \
    chromium nss freetype harfbuzz ca-certificates
RUN pip3 install --break-system-packages edge-tts
RUN fc-cache -f

# Install Piper TTS (offline, natural-sounding voices)
RUN mkdir -p /opt/piper-models && \
    wget -q https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz -O /tmp/piper.tar.gz && \
    tar xzf /tmp/piper.tar.gz -C /usr/local/bin/ --strip-components=1 piper/piper && \
    chmod +x /usr/local/bin/piper && \
    rm /tmp/piper.tar.gz || true

# Download Spanish Piper voice model (sharvard-medium, ~60MB)
RUN wget -q https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx -O /opt/piper-models/es_ES-sharvard-medium.onnx && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json -O /opt/piper-models/es_ES-sharvard-medium.onnx.json || true

ENV PIPER_BIN=/usr/local/bin/piper
ENV PIPER_MODELS_DIR=/opt/piper-models

ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# ---- Stage 1: Install dependencies ----
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai/package.json ./packages/ai/
COPY packages/media/package.json ./packages/media/
COPY packages/telegram/package.json ./packages/telegram/
COPY packages/publishers/package.json ./packages/publishers/

RUN npm ci --ignore-scripts

# ---- Stage 2: Generate Prisma client ----
FROM deps AS prisma
WORKDIR /app
COPY packages/db/prisma ./packages/db/prisma
RUN npx --workspace=packages/db prisma generate

# ---- Stage 3: Build ----
FROM prisma AS builder
WORKDIR /app

# Copy root tsconfig and all source code
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build the NestJS API
WORKDIR /app/apps/api
RUN npx nest build

# ---- Stage 4: Production image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from deps (includes all workspace deps)
COPY --from=prisma /app/node_modules ./node_modules

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy packages source (needed at runtime for workspace resolution)
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

# Copy Prisma schema (needed for db push at startup)
COPY --from=prisma /app/packages/db/prisma ./packages/db/prisma

# Copy entrypoint
COPY docker/api-entrypoint.sh /app/api-entrypoint.sh
RUN chmod +x /app/api-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/api-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]
