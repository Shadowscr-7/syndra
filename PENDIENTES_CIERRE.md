# Pendientes para Cerrar el Ciclo — Syndra/Automatismos

> Generado: 2026-03-09
> Alcance: Solo lo que ya existe y necesita terminarse (sin nuevas integraciones)

---

## 1. ~~Doble prefijo en 2 controllers~~ — ✅ RESUELTO

**Problema**: `main.ts` establece `app.setGlobalPrefix('api')` pero `VideoController` usaba `@Controller('api/videos')` y `AnalyticsController` usaba `@Controller('api/analytics')`, generando rutas `/api/api/videos/*` y `/api/api/analytics/*`. El frontend llama a `/api/videos/*` → 404.

**Fix**: Cambiado a `@Controller('videos')` y `@Controller('analytics')`.

### Bug derivado: Orden de rutas en VideoController

Al corregir el prefijo, el endpoint `GET /api/videos/providers` devolvía 500 porque `@Get(':id')` estaba declarado antes que `@Get('providers')`, `@Get('credits')`, etc. NestJS matcheaba `:id = 'providers'` → Prisma P2025 Not Found.

**Fix**: Se reordenaron todas las rutas estáticas (`templates`, `providers`, `credits`, `credits/history`, `render`, `render/:jobId`, `status/:id`, `preview/:id`, `export/:id`) **antes** del `@Get(':id')` genérico.

---

## 2. ~~Video UI desalineada con el backend~~ — ✅ RESUELTO

**Problema**: La página `video-pipeline/page.tsx` llamaba a:
- `GET /api/videos/credits` — ✅ Ya existía en el controller
- `GET /api/videos/render` — ✅ Ya existía (listRenderJobs)
- `POST /api/videos/render` — ✅ Ya existía (createRenderJob)
- `GET /api/videos/providers` — ✅ Ya existía (getProviders)

**Resultado**: Una vez corregido el doble prefijo, los endpoints coinciden correctamente.

---

## 3. ~~Proxy routes faltantes en el frontend~~ — ✅ RESUELTO

Ya existían proxies para: credits, auth, paypal, admin, media-folders, schedules, personas, profiles, visual-styles, credentials, partner, user-media.

Proxies creados:
- `/api/videos/[...path]/route.ts` — videos, render, providers, credits
- `/api/editorial/[...path]/route.ts` — runs, approve, reject, comments
- `/api/campaigns/[...path]/route.ts` — CRUD, active, operation-mode
- `/api/content/[...path]/route.ts` — generación de contenido
- `/api/strategy/[...path]/route.ts` — estrategia, brief
- `/api/research/[...path]/route.ts` — investigación
- `/api/onboarding/[...path]/route.ts` — wizard, status, complete
- `/api/publications/[...path]/route.ts` — publicaciones

---

## 4. ~~Campañas sin CRUD REST completo~~ — ✅ RESUELTO

**Problema**: Solo existían GET (list, active, findById) y PATCH (operation-mode). No había endpoints para crear, editar ni eliminar campañas.

**Fix**: Agregados al controller y service:
- `POST /api/campaigns` — Crear campaña
- `PUT /api/campaigns/:id` — Editar campaña
- `DELETE /api/campaigns/:id` — Eliminar campaña
- `PATCH /api/campaigns/:id/toggle` — Activar/desactivar

---

## 5. ~~`.env.example` completo~~ — ✅ RESUELTO

Se auditaron **todas** las variables usadas en el código (api, web, packages, docker-compose) y se actualizó `.env.example` con **45+ variables** organizadas por sección:

- PostgreSQL + `DATABASE_URL`
- Puertos (`API_PORT`, `WEB_PORT`)
- URLs de la app (`APP_URL`, `NEXT_PUBLIC_API_URL`, `API_URL`, `INTERNAL_API_URL`)
- Auth / JWT (`JWT_SECRET`, `CREDENTIALS_SECRET`)
- LLM, imágenes, Cloudinary
- Meta (Instagram/Facebook), Telegram
- Video IA: HeyGen, ElevenLabs, Replicate, fal.ai, D-ID, Hedra, Pika, Luma, GPU Worker
- PayPal + IDs de planes de suscripción
- Email (Resend)
- Discord (notificaciones)
- Supabase (opcional)
- Almacenamiento local (`UPLOAD_DIR`)
- Misc (`NODE_ENV`, `CRON_SECRET`)

---

## 6. Zero tests — PENDIENTE

No hay ningún archivo `.spec.ts` ni `.test.ts` en todo el proyecto. Ni unitarios, ni integración, ni e2e.

**Tests prioritarios sugeridos**:
1. Editorial pipeline (flujo completo PENDING → PUBLISHED)
2. Sistema de créditos (consume, add, balance, dedup PayPal)
3. Video tier router (selección de adapter, create/poll jobs)
4. Publishers (validar credenciales, publicar mock)
5. Auth guards (JWT, roles, tenant middleware)
6. Campaigns CRUD
7. API health + connectivity

**Esfuerzo**: 4-6 horas

---

## Resumen de Estado

| # | Tarea | Estado | Esfuerzo |
|---|---|---|---|
| 1 | Doble prefijo VideoController + AnalyticsController | ✅ Resuelto | — |
| 2 | Video UI desalineada con backend | ✅ Resuelto | — |
| 3 | Proxy routes faltantes (8 módulos) | ✅ Resuelto | — |
| 4 | CRUD REST completo campañas | ✅ Resuelto | — |
| 5 | `.env.example` completo | ✅ Resuelto | — |
| 6 | Tests básicos | ⏳ Pendiente | 4-6 hrs |

---

## Lo que YA está completo (no tocar)

- ✅ Pipeline editorial (8+ stages, research → publish)
- ✅ Sistema de créditos (PayPal, guards, interceptors, UI)
- ✅ 4 publishers reales (Instagram, Facebook, Threads, Discord)
- ✅ Telegram bot (pairing, previews, aprobación)
- ✅ Onboarding wizard multi-step
- ✅ Strategy module (LLM multi-provider)
- ✅ Media pipeline (17 adaptadores)
- ✅ Prisma schema (70 modelos)
- ✅ Docker compose (3 servicios)
- ✅ Todas las páginas del dashboard
