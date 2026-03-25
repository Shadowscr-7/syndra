# ============================================================
# Dockerfile — Web (Next.js 15)
# Multi-stage build: install → build → production (standalone)
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ---- Stage 1: Install dependencies ----
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/media/package.json ./packages/media/
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

# Copy root tsconfig and all source
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Set build-time env vars (can be overridden at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder

# API URL — client-side code uses relative /api paths, so empty string works
# Server components can override via runtime env
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js in standalone mode
WORKDIR /app/apps/web
RUN npx next build

# ---- Stage 4: Production image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3002

CMD ["node", "apps/web/server.js"]
