# ============================================================
# Dockerfile — API (NestJS 11)
# Multi-stage build: install → build → production
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl netcat-openbsd ffmpeg python3 py3-pip \
    fontconfig font-noto font-noto-emoji ttf-dejavu
RUN pip3 install --break-system-packages edge-tts
RUN fc-cache -f

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
