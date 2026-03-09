# MEJORAS 2 — Sistema de Planes y Feature Gating

> **Objetivo**: Separar claramente los 3 planes (Starter, Creator, Pro) con limitaciones reales en toda la plataforma. Cada usuario verá/podrá usar funcionalidades según su plan contratado. Lo que no puede usar se muestra con icono premium + modal de upgrade.

---

## Filosofía de Pricing

| Plan | Valor | Usuario típico | Precio sugerido |
|------|-------|----------------|-----------------|
| **Starter** | Crear y publicar contenido | Creadores pequeños, negocios locales | $12–15/mes |
| **Creator** | Automatizar contenido | Creadores activos, marcas personales | $29–39/mes |
| **Pro** | Crecer y optimizar con IA (AI Growth Engine) | Agencias, equipos, power users | $79–99/mes |

**Distribución esperada**: Starter 30% · Creator 60% · Pro 10%

**Regla psicológica**:
- Starter debe sentirse limitado
- Creator debe sentirse como el mejor valor
- Pro debe ser aspiracional (incluye "AI Growth Engine")

---

## 1. SCHEMA: Actualizar modelo Plan en Prisma

### 1.1 Agregar campos faltantes al modelo Plan

- [ ] Agregar campo `maxVisualStyles Int @default(1)` — límite de estilos visuales
- [ ] Agregar campo `maxExperiments Int @default(0)` — límite A/B tests activos (-1=ilimitado)
- [ ] Agregar campo `trendDetectionEnabled Boolean @default(false)` — habilitar detección de tendencias
- [ ] Agregar campo `aiStrategistEnabled Boolean @default(false)` — habilitar el estratega IA
- [ ] Agregar campo `videoEnabled Boolean @default(false)` — habilitar video pipeline
- [ ] Agregar campo `brandMemoryEnabled Boolean @default(false)` — habilitar memoria de marca
- [ ] Agregar campo `learningLoopLevel String @default("none")` — nivel: none | basic | medium | full
- [ ] Agregar campo `autopilotLevel String @default("manual")` — nivel: manual | approval | assisted | full
- [ ] Agregar campo `analyticsLevel String @default("basic")` — nivel: basic | complete | ai
- [ ] Agregar campo `teamEnabled Boolean @default(false)` — habilitar colaboración/equipo
- [ ] Agregar campo `priorityQueue Boolean @default(false)` — colas rápidas
- [ ] Agregar campo `apiAccess Boolean @default(false)` — acceso API futura
- [ ] Ejecutar `npx prisma migrate dev` tras los cambios

### 1.2 Seed: Definir los 3 planes con valores exactos

- [ ] Plan **Starter** (name: `starter`):
  - `monthlyPrice`: 1500 (=$15), `yearlyPrice`: 14400 (=$144, 2 meses gratis)
  - `maxPublications`: 40, `maxVideos`: 0, `maxSources`: 3, `maxChannels`: 2, `maxEditors`: 1
  - `maxPersonas`: 1, `maxContentProfiles`: 1, `maxVisualStyles`: 1
  - `maxStorageMb`: 500, `maxScheduleSlots`: 5, `maxExperiments`: 0
  - `analyticsEnabled`: true, `analyticsLevel`: "basic"
  - `aiScoringEnabled`: false, `trendDetectionEnabled`: false, `aiStrategistEnabled`: false
  - `videoEnabled`: false, `brandMemoryEnabled`: false, `teamEnabled`: false
  - `learningLoopLevel`: "basic", `autopilotLevel`: "approval"
  - `priorityQueue`: false, `apiAccess`: false

- [ ] Plan **Creator** (name: `creator`):
  - `monthlyPrice`: 3900 (=$39), `yearlyPrice`: 37200 (=$372, 2 meses gratis)
  - `maxPublications`: 150, `maxVideos`: 10, `maxSources`: 10, `maxChannels`: 4, `maxEditors`: 2
  - `maxPersonas`: 3, `maxContentProfiles`: 5, `maxVisualStyles`: 3
  - `maxStorageMb`: 2048, `maxScheduleSlots`: 20, `maxExperiments`: 5
  - `analyticsEnabled`: true, `analyticsLevel`: "complete"
  - `aiScoringEnabled`: true, `trendDetectionEnabled`: true (básico), `aiStrategistEnabled`: true
  - `videoEnabled`: true, `brandMemoryEnabled`: false, `teamEnabled`: true
  - `learningLoopLevel`: "medium", `autopilotLevel`: "assisted"
  - `priorityQueue`: false, `apiAccess`: false

- [ ] Plan **Pro** (name: `pro`):
  - `monthlyPrice`: 9900 (=$99), `yearlyPrice`: 94800 (=$948, 2 meses gratis)
  - `maxPublications`: -1 (ilimitado), `maxVideos`: 50, `maxSources`: -1, `maxChannels`: -1, `maxEditors`: 5
  - `maxPersonas`: -1, `maxContentProfiles`: -1, `maxVisualStyles`: -1
  - `maxStorageMb`: 10240, `maxScheduleSlots`: -1, `maxExperiments`: -1
  - `analyticsEnabled`: true, `analyticsLevel`: "ai"
  - `aiScoringEnabled`: true, `trendDetectionEnabled`: true (completo), `aiStrategistEnabled`: true
  - `videoEnabled`: true, `brandMemoryEnabled`: true, `teamEnabled`: true
  - `learningLoopLevel`: "full", `autopilotLevel`: "full"
  - `priorityQueue`: true, `apiAccess`: true

---

## 2. BACKEND: Servicio de Plan Limits + Guards

### 2.1 Crear `PlanLimitsService`

- [ ] Crear `apps/api/src/plans/plan-limits.service.ts`
- [ ] Método `getPlanForWorkspace(workspaceId)` → retorna Plan con todos los campos
- [ ] Método `checkLimit(workspaceId, resource, currentCount?)` → `{ allowed: boolean, limit: number, current: number, planRequired?: string }`
- [ ] Método `checkFeature(workspaceId, feature)` → `{ allowed: boolean, planRequired?: string }`
- [ ] Cachear plan por workspace (TTL 5 min) para no consultar DB en cada request

### 2.2 Guard `@PlanFeature()` decorator

- [ ] Crear decorator `@PlanFeature('videoEnabled')` para endpoints
- [ ] Crear `PlanFeatureGuard` que lee el decorator y valida contra el plan del workspace
- [ ] Respuesta 403 con body: `{ code: "PLAN_LIMIT", feature: "video", requiredPlan: "creator", currentPlan: "starter" }`

### 2.3 Guard `@PlanLimit()` decorator

- [ ] Crear decorator `@PlanLimit('maxPublications')` para endpoints de creación
- [ ] Crear `PlanLimitGuard` que cuenta recursos actuales vs límite del plan
- [ ] Respuesta 403 con body: `{ code: "PLAN_LIMIT", resource: "publications", limit: 40, current: 40, requiredPlan: "creator" }`

### 2.4 Aplicar guards a cada módulo del API

- [ ] **Editorial** (`editorial.controller.ts`): `@PlanLimit('maxPublications')` en crear contenido
- [ ] **Video** (`video/`): `@PlanFeature('videoEnabled')` en todos los endpoints de video
- [ ] **Campaigns**: `@PlanLimit('maxChannels')` en conectar canal
- [ ] **Research/Sources**: `@PlanLimit('maxSources')` en agregar fuente RSS
- [ ] **Profiles**: `@PlanLimit('maxPersonas')` en crear persona, `@PlanLimit('maxContentProfiles')` en crear perfil
- [ ] **Strategy**: `@PlanFeature('aiStrategistEnabled')` en generar estrategia
- [ ] **Trends**: `@PlanFeature('trendDetectionEnabled')` en detección de tendencias
- [ ] **Analytics**: validar `analyticsLevel` para scoring/insights IA
- [ ] **Experiments**: `@PlanLimit('maxExperiments')` en crear experimento A/B
- [ ] **Brand Memory**: `@PlanFeature('brandMemoryEnabled')` en todos los endpoints
- [ ] **Scheduler**: `@PlanLimit('maxScheduleSlots')` en crear slot
- [ ] **Media**: `@PlanLimit('maxStorageMb')` en upload (chequear storage usado)
- [ ] **Team/Invitations**: `@PlanLimit('maxEditors')` en invitar usuario, `@PlanFeature('teamEnabled')`
- [ ] **Workspace settings**: validar `autopilotLevel` al cambiar operation mode

### 2.5 Endpoint de plan info para el frontend

- [ ] `GET /api/workspaces/:id/plan` → retorna plan completo + usage actual
  ```json
  {
    "plan": { "name": "starter", "displayName": "Starter", ... },
    "usage": {
      "publications": { "used": 23, "limit": 40 },
      "videos": { "used": 0, "limit": 0 },
      "channels": { "used": 1, "limit": 2 },
      "sources": { "used": 2, "limit": 3 },
      "storageMb": { "used": 120, "limit": 500 },
      "scheduleSlots": { "used": 3, "limit": 5 }
    },
    "features": {
      "video": false,
      "aiStrategist": false,
      "trendDetection": false,
      "aiScoring": false,
      "brandMemory": false,
      "team": false,
      "analyticsLevel": "basic",
      "learningLoopLevel": "basic",
      "autopilotLevel": "approval"
    }
  }
  ```

---

## 3. FRONTEND: Context + Hook de Plan

### 3.1 Crear `PlanContext` + `PlanProvider`

- [ ] Crear `apps/web/src/lib/plan-context.tsx`
- [ ] `PlanProvider` que llama al endpoint `/api/workspaces/:id/plan` y cachea
- [ ] Wrappear en `layout.tsx` del dashboard
- [ ] Expone `usePlan()` hook con:
  - `plan` — objeto Plan completo
  - `usage` — uso actual de cada recurso
  - `features` — mapa de features habilitadas
  - `canUse(feature: string)` → boolean
  - `isWithinLimit(resource: string)` → boolean
  - `requiredPlanFor(feature: string)` → "starter" | "creator" | "pro"

### 3.2 Componente `<PremiumGate>`

- [ ] Crear `apps/web/src/components/ui/premium-gate.tsx`
- [ ] Props: `feature?: string`, `resource?: string`, `children`, `fallback?`
- [ ] Si `canUse(feature)` → renderiza children normalmente
- [ ] Si no → renderiza children con overlay + icono premium (👑 o 💎)
- [ ] Al hacer click → abre `<UpgradeModal>`

### 3.3 Componente `<UpgradeModal>`

- [ ] Crear `apps/web/src/components/ui/upgrade-modal.tsx`
- [ ] Props: `feature: string`, `requiredPlan: string`, `currentPlan: string`
- [ ] Diseño dark theme (glassmorphism) con:
  - Icono premium grande centrado
  - Título: "Funcionalidad Premium"
  - Descripción: explicación de qué incluye y por qué es útil
  - Nombre del plan requerido con precio
  - Botón CTA: "Actualizar a {plan}" → navega a `/dashboard/settings` o página de billing
  - Botón secundario: "Ver todos los planes"
- [ ] Map de features → descripciones amigables en español

### 3.4 Componente `<UsageBadge>`

- [ ] Crear `apps/web/src/components/ui/usage-badge.tsx`
- [ ] Muestra "23/40" con barra de progreso mini
- [ ] Cambia color: verde (<60%), amarillo (60-85%), rojo (>85%)
- [ ] Tooltip con detalle: "Publicaciones usadas este mes"

### 3.5 Componente `<LimitReachedBanner>`

- [ ] Crear `apps/web/src/components/ui/limit-reached-banner.tsx`
- [ ] Se muestra cuando un recurso está al 100%
- [ ] Estilo warning con CTA de upgrade

---

## 4. SIDEBAR: Gating de menú por plan

### 4.1 Agregar `minPlan` a cada item del sidebar

- [ ] Modificar interface `SidebarSection.items` para incluir `minPlan?: 'starter' | 'creator' | 'pro'`
- [ ] Asignar `minPlan` a cada item según esta tabla:

| Item | minPlan | Motivo |
|------|---------|--------|
| Dashboard | — | Todos |
| Cola Editorial | — | Todos |
| Alertas | — | Todos |
| Estratega IA | `creator` | No incluido en Starter |
| Historial | `creator` | Va con Estratega |
| Campañas | — | Todos |
| Tendencias | `creator` | Trend detection |
| Temas | — | Todos |
| Playbooks | — | Todos (limitado en funciones internas) |
| Perfiles IA | — | Todos (limitado a 1 en Starter) |
| Scheduler | — | Todos (limitado a 5 slots en Starter) |
| Biblioteca | — | Todos |
| Video Pipeline | `creator` | No video en Starter |
| Assets | — | Todos |
| Analytics | — | Todos (nivel varía por plan) |
| Benchmarking | `creator` | Análisis avanzado |
| Scoring | `creator` | AI Scoring |
| Experimentos | `creator` | A/B testing |
| Aprendizaje | — | Todos (nivel varía) |
| Memoria Marca | `pro` | Solo Pro |
| Trust Fuentes | — | Todos |
| Fuentes RSS | — | Todos (limitado a 3 en Starter) |
| Credenciales | — | Todos |
| Configuración | — | Todos |

### 4.2 Renderizar items bloqueados con icono premium

- [ ] Items con `minPlan` superior al plan actual: mostrar con opacidad reducida + icono 💎 a la derecha
- [ ] Al click → abrir `<UpgradeModal>` en vez de navegar
- [ ] NO ocultar los items — el usuario debe ver qué le falta (genera FOMO)

### 4.3 Badge del plan actual en sidebar

- [ ] Mostrar chip con el plan actual debajo del avatar de usuario
- [ ] Estilo: Starter=gris, Creator=morado, Pro=dorado con brillo
- [ ] Link a la página de billing/planes

---

## 5. PÁGINAS: Gating in-page por plan

### 5.1 Dashboard principal

- [ ] Mostrar `<UsageBadge>` para publicaciones, canales, storage en la parte superior
- [ ] Si plan=Starter: ocultar widgets de "AI Insights", "Trend Radar", mostrar placeholder premium
- [ ] Agregar barra de uso tipo "23 de 40 publicaciones usadas" con progress bar

### 5.2 Analytics

- [ ] Starter: solo básico (likes, comments, engagement, últimos posts) — ocultar tabs de scoring/insights IA con `<PremiumGate>`
- [ ] Creator: completo — todo menos "AI Insights" tab
- [ ] Pro: completo + AI Insights tab activo

### 5.3 Editorial / Cola Editorial

- [ ] Al intentar crear contenido si `maxPublications` alcanzado → `<LimitReachedBanner>` + botón deshabilitado
- [ ] Operation mode selector en settings: mostrar opciones de autopilot según `autopilotLevel`
  - Starter: solo APPROVAL_REQUIRED disponible, MANUAL visible
  - Creator: +ASSISTED disponible
  - Pro: +FULLY_AUTOMATIC disponible
  - Opciones no disponibles → icono 💎 + tooltip

### 5.4 Video Pipeline

- [ ] Si `videoEnabled=false` → toda la página envuelta en `<PremiumGate feature="video">`
- [ ] Si habilitado: mostrar `<UsageBadge>` de videos (10/10 o 23/50)

### 5.5 AI Strategist

- [ ] Si `aiStrategistEnabled=false` → `<PremiumGate feature="aiStrategist">`
- [ ] Si habilitado pero Starter → no debería llegar (sidebar bloqueado)

### 5.6 Trends / Tendencias

- [ ] Si `trendDetectionEnabled=false` → `<PremiumGate feature="trendDetection">`

### 5.7 Experiments / A/B Testing

- [ ] Si `maxExperiments=0` → `<PremiumGate feature="experiments">`
- [ ] Si habilitado → `<UsageBadge>` con count "3/5 experimentos activos"

### 5.8 Brand Memory / Memoria de Marca

- [ ] Si `brandMemoryEnabled=false` → `<PremiumGate feature="brandMemory">`
- [ ] Solo Pro tiene acceso

### 5.9 Benchmarking + Scoring

- [ ] Si `aiScoringEnabled=false` → `<PremiumGate>` en las páginas de benchmark y scoring

### 5.10 Team / Equipo

- [ ] Si `teamEnabled=false` → `<PremiumGate feature="team">`
- [ ] Si habilitado → `<UsageBadge>` de miembros "2/2" o "3/5"

### 5.11 Perfiles IA / Personas

- [ ] Botón "Crear persona" → si `currentCount >= maxPersonas` → modal de límite
- [ ] Mostrar "1/1 personas" o "3/3 personas" con `<UsageBadge>`

### 5.12 Content Profiles

- [ ] Igual que personas — botón crear deshabilitado si al límite

### 5.13 Scheduler

- [ ] Botón "Agregar slot" → si `currentSlots >= maxScheduleSlots` → modal de límite
- [ ] `<UsageBadge>` "5/5 slots"

### 5.14 Fuentes RSS

- [ ] Botón "Agregar fuente" → si al límite → modal
- [ ] `<UsageBadge>` "3/3 fuentes"

### 5.15 Media / Biblioteca

- [ ] Botón "Subir" → si storage al límite → modal
- [ ] `<UsageBadge>` "120MB/500MB" con barra

---

## 6. CANALES: Gating de canales por plan

- [ ] Starter: máximo 2 canales (Instagram, Facebook, Discord, Threads — elige 2)
- [ ] Creator: máximo 4 canales
- [ ] Pro: ilimitados
- [ ] Al intentar conectar un canal nuevo si al límite → `<UpgradeModal>`

---

## 7. FEATURE PREMIUM: AI Growth Engine (solo Pro)

### 7.1 Branding del paquete

- [ ] Agregar badge "AI Growth Engine" en Pro — funcionalidad diferenciadora
- [ ] Incluye: learning loop completo + strategist avanzado + trend radar + autopilot total
- [ ] Crear mini landing/card dentro del dashboard que explique qué es
- [ ] Starter y Creator ven un card premium "Desbloquea AI Growth Engine" con preview

### 7.2 Componentes del Growth Engine

- [ ] Learning loop completo: optimización automática de prompts, CTAs, hooks
- [ ] Strategist avanzado: plan semanal automático + recomendaciones estratégicas
- [ ] Trend radar completo: detección automática + alertas Telegram + campañas directas
- [ ] Autopilot total: generar → aprobar auto → publicar sin intervención

---

## 8. PÁGINA DE PLANES / BILLING

### 8.1 Página `/dashboard/plans` para usuarios

- [ ] Rediseñar la página de planes existente para que cualquier usuario la vea (no solo admin)
- [ ] 3 cards de planes con comparación visual (destacar Creator como "Más popular")
- [ ] Plan actual marcado con "Tu plan" badge
- [ ] Botón "Actualizar" que lleva a flujo de pago (PayPal / Stripe)
- [ ] Toggle mensual / anual con ahorro visible ("Ahorra 2 meses")

### 8.2 Página de billing / facturación

- [ ] Mostrar: plan actual, próxima factura, historial de pagos
- [ ] Botón cambiar plan / cancelar suscripción
- [ ] Uso actual de todos los límites con barras de progreso

---

## 9. NOTIFICACIONES DE LÍMITE

- [ ] Al llegar al 80% de un recurso → notificación in-app "Estás cerca del límite de publicaciones"
- [ ] Al llegar al 100% → banner rojo + notificación
- [ ] Email opcional cuando se alcanza un límite
- [ ] Telegram (si conectado): alerta de límite alcanzado

---

## 10. API RESPONSES CONSISTENTES

- [ ] Todos los 403 de plan tienen estructura:
  ```json
  {
    "statusCode": 403,
    "code": "PLAN_LIMIT",
    "message": "Has alcanzado el límite de tu plan Starter",
    "details": {
      "resource": "publications",
      "limit": 40,
      "current": 40,
      "requiredPlan": "creator",
      "requiredPlanDisplayName": "Creator"
    }
  }
  ```
- [ ] El frontend intercepta globalmente 403 con `code: "PLAN_LIMIT"` y muestra `<UpgradeModal>` automáticamente

---

## Resumen de tareas por sección

| Sección | Items |
|---------|-------|
| 1. Schema + Seed | 16 |
| 2. Backend Guards | 19 |
| 3. Frontend Contexto + Componentes | 14 |
| 4. Sidebar Gating | 5 |
| 5. Páginas Gating | 20 |
| 6. Canales | 4 |
| 7. AI Growth Engine | 6 |
| 8. Billing Page | 6 |
| 9. Notificaciones | 4 |
| 10. API Responses | 2 |
| **TOTAL** | **~96 tareas** |

---

## Comparación rápida de features

| Feature | Starter | Creator | Pro |
|---------|---------|---------|-----|
| Publicaciones/mes | 40 | 150 | ∞ |
| Canales | 2 | 4 | ∞ |
| Usuarios | 1 | 2 | 5 |
| Video/mes | ❌ | 10 | 50 |
| Analytics | básico | completo | completo + IA |
| AI Strategist | ❌ | ✔ | ✔ avanzado |
| Trend detection | ❌ | básico | completo |
| Autopilot | aprobación | parcial | completo |
| Learning loop | básico | medio | completo |
| A/B testing | ❌ | 5 activos | ∞ |
| Fuentes RSS | 3 | 10 | ∞ |
| Scheduler slots | 5 | 20 | ∞ |
| Personas IA | 1 | 3 | ∞ |
| Content profiles | 1 | 5 | ∞ |
| Visual styles | 1 | 3 | ∞ |
| Brand Memory | ❌ | ❌ | ✔ |
| AI Growth Engine | ❌ | ❌ | ✔ |
| Storage | 500MB | 2GB | 10GB |
| Equipo | ❌ | 2 | 5 |
| Priority queue | ❌ | ❌ | ✔ |
| API access | ❌ | ❌ | ✔ |
| Precio mensual | $15 | $39 | $99 |
| Precio anual | $144 | $372 | $948 |
