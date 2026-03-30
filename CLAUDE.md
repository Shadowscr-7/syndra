# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Syndra** (internal name: Automatismos) — a multi-tenant SaaS platform for AI-powered social media content automation. Targeted at creators, agencies and businesses in LATAM. The platform automates the full editorial pipeline: research → strategy → content → media generation → human approval via Telegram → publishing across social platforms.

**Domain**: `aivanguard.app` — deployed at `syndra.aivanguard.app`
**Brand**: "Syndra" (product name), "Automatismos" (repo/internal name)
**Partners/early users**: Sebas Mora, ANDRU, dZanderr, Putupau, BigData News, Cometware, Alexis Martinovic, ARXEM, Guitarra Libre.

---

## Monorepo Structure

npm workspaces + Turbo. Two apps, five packages:

- `apps/api/` — NestJS 11 backend, port 3001, prefix `/api`
- `apps/web/` — Next.js 15 dashboard (App Router), port 3002
- `packages/db/` — Prisma schema (~70 models) and generated client
- `packages/shared/` — DTOs, events, enums, crypto utils (AES-256-GCM), tone presets
- `packages/ai/` — LLM adapters (OpenAI, Anthropic) and prompt builders
- `packages/media/` — Image generation, Sharp composer, Remotion templates, FFmpeg video renderer, TTS adapters
- `packages/publishers/` — Social media publisher adapters (Instagram, Facebook, Threads, Discord, Mock)
- `packages/telegram/` — Telegram bot keyboards, message formatters, callback mappers

---

## Commands

```bash
# Development
npm run dev          # Start both API and Web concurrently
npm run dev:api      # NestJS only (port 3001)
npm run dev:web      # Next.js only (port 3002)

# Build & quality
npm run build        # Build all workspaces (Turbo-cached)
npm run lint         # ESLint across all workspaces
npm run typecheck    # tsc --noEmit across all workspaces
npm run format       # Prettier write
npm run format:check # Prettier check (used in CI)

# Database
npm run db:generate  # Generate Prisma client — REQUIRED after any schema change
npm run db:migrate   # Run pending migrations (dev)
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio on port 5555

# Docker (full stack: PostgreSQL + API + Web)
docker-compose up -d
docker-compose down

# Production update (on VPS at /opt/syndra)
git pull origin main && docker compose down && docker compose up -d --build
```

**CI order**: `npm ci` → `db:generate` → `lint` → `typecheck` → `build`

PostgreSQL runs on port **5434** (not the standard 5432) in local dev.

---

## Deployment

- **VPS**: Hostinger Ubuntu 22.04/24.04 (2 vCPU, 8 GB RAM), deployed at `/opt/syndra`
- **Reverse proxy**: Caddy with automatic SSL. `/api/*` → port 3001, `/*` → port 3002
- **Firewall**: Only ports 22, 80, 443 exposed. Never expose 3001, 3002, or 5434 externally.
- **DB backups**: Daily cron at 3am via `pg_dump`. TODO: rclone upload to cloud bucket (R2/B2/S3).
- **Secrets needed**: `JWT_SECRET`, `CREDENTIALS_SECRET` (64-char hex), PayPal LIVE credentials, `RESEND_API_KEY`

---

## Key Architecture

### NestJS API Module Layout

`apps/api/src/app.module.ts` imports 30+ feature modules. Each module is self-contained (controller, service, DTOs). `TenantMiddleware` applied globally extracts the active workspace from every request.

### Editorial Pipeline (Core Business Logic)

The central workflow is `EditorialRun`, a linear state machine:

```
PENDING → RESEARCH → STRATEGY → CONTENT → MEDIA → COMPLIANCE → REVIEW → APPROVED → PUBLISHING → PUBLISHED
```

Also terminal states: `REJECTED`, `FAILED`, `POSTPONED`.

Each stage produces intermediate artifacts (`ResearchSnapshot`, `ContentBrief`, etc.) stored in DB. Config cascades: run-level → campaign defaults → workspace defaults → active persona + default content profile.

**Two research paths** based on `ContentTheme.type`:
- `TRENDING` / `EVERGREEN` → RSS fetch from sources → LLM extraction → research summary
- `PRODUCT` / `OFFER` / `SERVICE` / `TESTIMONIAL` / `ANNOUNCEMENT` / `SEASONAL` / `BEHIND_SCENES` / `EDUCATIONAL` → internal `BusinessBrief` records, no RSS needed

**Media composition**: For promotional themes, the pipeline uses `MediaEngineService.generatePromotionalImage()` which generates a background via AI and composes product images + logo watermark using **Sharp** (`packages/media/src/composers/sharp-renderer.ts`). Non-promotional themes just call `generateSingleImage()`.

**Cron jobs**:
- Daily at 7:00 AM (MX timezone): creates editorial runs for all active workspaces
- Every 6 hours: stale run detection (marks as FAILED after 2h stuck)
- Every 15 minutes: checks schedule slots, fires runs per user-defined schedule
- Every 6 hours: collect Instagram/Facebook metrics
- Every Monday 8:00 AM: generate performance insights
- Every Monday 9:00 AM: send weekly Telegram summary

### Async Job Processing

Five Supabase pgmq queues: `editorial_jobs`, `media_jobs`, `publish_jobs`, `video_jobs`, `analytics_jobs`. Workers poll with retry logic (max 3 retries, exponential backoff). **Falls back to synchronous inline execution** when pgmq is unavailable.

### Adapter Pattern

Every external integration goes through an adapter interface:
- **LLM**: `LLMAdapter` → OpenAI / Anthropic / Placeholder
- **Image**: `ImageGeneratorAdapter` → DALL-E / HuggingFace (Flux.1-schnell) / Pollinations (free, no key) / Mock
- **Image composition**: `ImageComposer` (Sharp-based, 7 templates: product-showcase, offer-banner, logo-watermark, testimonial-card, announcement, minimal-product, price-tag)
- **Video Option 1**: `VideoCompositorService` → FFmpeg Pro renderer (TTS + images + subtitles + music, up to 60s, 3 credits base)
- **Video Option 2**: `KieVideoAdapter` → Kling 2.6 text-to-video via Kie AI (5-10s, 20 credits)
- **TTS**: ElevenLabs / Edge TTS (free, multiple ES voices) / Piper TTS (offline, natural quality)
- **Publishers**: `PublisherAdapter` per platform — Instagram, Facebook, Threads, Discord (all live); Twitter/X, LinkedIn, TikTok, Pinterest, YouTube, WhatsApp (planned)
- **Music**: Kie AI / Suno for background music (3 additional credits)

### Video Pipeline V2

Two generation modes on `/dashboard/videos`:
1. **Compositor (FFmpeg)**: User selects images from library + narration text + TTS voice + subtitles toggle + background music (Suno via Kie) → professional video up to 60s. Supports "Product Launch" mode with logo, product image, price overlay, CTA.
2. **Kie AI**: Text prompt → Kling 2.6 text-to-video → 5s or 10s reel (9:16, 16:9, 1:1).

Endpoints: `POST /videos/render-compositor` (3 credits) and `POST /videos/render-kie` (20 credits). Worker polls until render completes, uploads to Cloudinary, saves `MediaAsset`.

Remotion templates also exist (`packages/media/src/templates/`) with full storyboard support, 6 presets (Reel de Producto, Story Educativa, Hook+Desarrollo, Before/After, Testimonial, Storytelling), 4 subtitle styles (pill, minimal, word-by-word, karaoke), and Piper TTS integration. These are separate from the FFmpeg compositor path.

### Multi-Tenancy

`Workspace` is the tenant boundary. `WorkspaceUser` maps users to workspaces with roles (`OWNER`, `EDITOR`, `VIEWER`). Platform-level roles (`ADMIN`, `COLLABORATOR`, `USER`) exist on the `User` model. Credentials (`ApiCredential`) stored AES-256-GCM encrypted per workspace, with env var fallback.

### Plan System (Starter / Creator / Pro)

Three tiers with hard enforcement via `PlanLimitsGuard` and `PlanFeatureGuard`:

| Resource | Starter | Creator | Pro |
|----------|---------|---------|-----|
| Publications/mo | 40 | 150 | ∞ |
| Videos/mo | 0 | 10 | 50 |
| RSS Sources | 3 | 10 | ∞ |
| Channels | 2 | 4 | ∞ |
| Schedule slots | 5 | 20 | ∞ |
| Personas | 1 | 3 | ∞ |
| Content profiles | 1 | 5 | ∞ |
| A/B experiments | 0 | 5 | ∞ |
| Storage | 500 MB | 2 GB | 10 GB |
| Price (monthly) | $15 | $39 | $99 |

Feature gates: `videoEnabled` (Creator+), `aiStrategistEnabled` (Creator+), `trendDetectionEnabled` (Creator+), `aiScoringEnabled` (Creator+), `teamEnabled` (Creator+), `brandMemoryEnabled` (Pro only), `priorityQueue` (Pro only), `apiAccess` (Pro only).

Frontend enforces via `usePlanLimits()` hook + `UpgradeOverlay` component. Backend 403s use structure `{ code: "PLAN_LIMIT", resource, limit, current, requiredPlan }`.

### Credit System

Separate from subscriptions. Used for premium AI operations:
- Compositor Video: 3 credits base (+ 3 for music)
- Kie AI Video: 20 credits
- Premium images (Replicate/Ideogram): 5 credits (planned)
- Product animation (Wan 2.1): 10 credits (planned)

Credits managed via `AICredit` / `VideoCredit` models. Creator gets 100 free credits on signup. Pro is unlimited. Starter: no credits (free providers only).

### Authentication

JWT with refresh token rotation, stored in HTTP-only cookies. Token family tracking detects refresh token reuse. Rate limiting: FREE 30 req/min, PRO 120, ENTERPRISE 300.

### Affiliation / Partner System

`COLLABORATOR` role users get auto-generated codes (e.g., `AGUS20`). Codes give 20% discount to referred users. Platform pays 20% commission (first payment only). Admin manages: approve → generate payout batch → mark as paid. Commission cycle: PENDING → APPROVED → PAID.

### Key Database Models

38 Prisma models (as per FUNCIONALIDADES.md) covering: `User`, `Workspace`, `WorkspaceUser`, `Campaign`, `EditorialRun`, `ContentBrief`, `ResearchSnapshot`, `ContentVersion`, `MediaAsset`, `Publication`, `ApiCredential`, `AuditLog`, `CreditBalance`, `AICredit`, `VideoCredit`, `Plan`, `Subscription`, `AffiliateReferral`, `CommissionPayout`, `TelegramLink`, `PublishSchedule`, `ScheduleSlot`, `UserMedia`, `MediaFolder`, `BusinessBrief`, `ContentTheme`, `UserPersona`, `ContentProfile`, `VisualStyleProfile`, `PerformanceInsight`.

### Supabase Integration

Used for storage buckets (`media-assets`, `brand-assets`, `research-snapshots`) and pgmq job queues. Row-level security on storage. Auth (email + magic link) is an option but JWT is primary.

### AI Prompt Architecture

All prompts live in `packages/ai/src/prompts/`. They are **dynamic** — roles are NOT hardcoded. Every prompt receives `industryContext` / `persona.expertise` / `workspace.industry` so the AI adapts to the user's actual business (not always "tech/AI"). Prompt files: `content.prompts.ts`, `research.prompts.ts`, `strategy.prompts.ts`, `trend.prompts.ts`, `business.prompts.ts` (for internal/business-driven research without RSS).

---

## Social Platform Status

| Platform | Organic Publishing | OAuth Config |
|----------|-------------------|--------------|
| Instagram | ✅ Live (Graph API v21) | ✅ META_APP_ID configured |
| Facebook | ✅ Live (Graph API v21) | ✅ Same Meta app |
| Threads | ✅ Live (graph.threads.net v1.0) | ✅ Same Meta app |
| Discord | ✅ Live (webhooks) | N/A |
| Twitter/X | ❌ Adapter not built | ❌ Keys not configured |
| LinkedIn | ❌ Adapter not built | ❌ Keys not configured |
| TikTok | ❌ Adapter not built | ❌ Keys not configured |
| YouTube | ❌ Adapter not built | ❌ Keys not configured |
| Pinterest | ❌ Adapter not built | ❌ Keys not configured |
| WhatsApp Status | ❌ Planned (Evolution API) | N/A |

---

## Frontend Dashboard Pages

29 pages under `apps/web/src/app/dashboard/`. Key routes:
- `/dashboard/editorial` — Queue of editorial runs, create manual runs
- `/dashboard/editorial/[id]` — Full run detail: research, brief, content versions, media, approval
- `/dashboard/videos` — Video Pipeline V2 (Compositor + Kie AI tabs)
- `/dashboard/my-business/briefs` — Business briefs (internal research data: products, offers, testimonials)
- `/dashboard/create-promotion` — 3-step wizard to create promotional content
- `/dashboard/credentials` — API key management + Meta OAuth flow
- `/dashboard/admin` — Admin dashboard (only visible to ADMIN role)

Next.js middleware at `middleware.ts` protects all `/dashboard/*` routes.

API calls from the web use proxy routes at `apps/web/src/app/api/` (one catch-all per domain: videos, editorial, campaigns, content, strategy, research, onboarding, publications, credits, auth, paypal, admin, media-folders, schedules, personas, profiles, visual-styles, credentials, partner, user-media).

---

## Known Pending Items

- **Tests**: Zero test files exist (no `.spec.ts` / `.test.ts`). Highest priority: editorial pipeline, credit system, video tier router, publishers, auth guards.
- **Cloud backup**: DB backups saved locally on VPS. `rclone` to R2/B2/S3 not yet configured.
- **`/tmp` space**: Verify sufficient disk space in the API container for FFmpeg video rendering.
- **Social OAuth**: Twitter, LinkedIn, TikTok, Google, Pinterest, MercadoLibre OAuth credentials need registering in their developer portals before enabling those adapters.
- **Stripe**: Credit purchases planned via Stripe Checkout (not yet implemented — only PayPal for subscriptions).

---

## TypeScript Configuration

Strict mode throughout. Base config in `tsconfig.base.json` (target ES2022, module ESNext). Turbo ensures build order so dependent packages compile before consumers. Always run `npm run db:generate` after Prisma schema changes before building.

## Environment

Copy `.env.example` to `.env`. Key variable groups: `DATABASE_URL` (port 5434 locally), `JWT_SECRET` + `CREDENTIALS_SECRET` (64-char hex), `APP_URL` / `NEXT_PUBLIC_URL` / `NEXT_PUBLIC_API_URL`, LLM keys (OpenAI, Anthropic), Meta OAuth (`META_APP_ID`, `META_APP_SECRET`), `TELEGRAM_BOT_TOKEN`, video providers (`HEYGEN_API_KEY`, `KIE_API_KEY`), TTS (`ELEVENLABS_API_KEY`), image providers, Cloudinary, PayPal subscription IDs (12 plan IDs for monthly/yearly per tier), `RESEND_API_KEY`, `PIPER_BIN` + `PIPER_MODELS_DIR` (for Piper TTS in Docker).
