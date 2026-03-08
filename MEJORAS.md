# 🚀 Syndra — Plan Maestro de Mejoras

> Checklist completo de mejoras priorizadas para cerrar el núcleo diferencial del producto.
> Fecha de planificación: 8 de Marzo 2026.

---

## ENFOQUE GENERAL

Syndra ya tiene muchas features. Lo que falta ahora no es "más cantidad", sino **cerrar el núcleo diferencial del producto**.

### Ejes Diferenciales

| Eje | Objetivo |
|-----|----------|
| **Syndra aprende** | No solo mide — adapta decisiones futuras según performance |
| **Syndra piensa estratégicamente** | No solo genera — planifica y recomienda |
| **Syndra detecta oportunidades** | No solo reacciona a fuentes — identifica tendencias accionables |
| **Syndra es fácil de activar y escalar** | No solo poderoso — accesible, activable y comercialmente escalable |

---

## PRIORIDAD P0 — IMPRESCINDIBLE ANTES O DURANTE EL LANZAMIENTO

---

### ✅ 1. Cerrar el "Content Intelligence Loop" real

**Estado:** crítico / principal diferencial

**Qué es:** Que Syndra pase de "genera + publica + mide" a "genera + publica + mide + **aprende** + **adapta decisiones futuras**".

**Por qué importa:** Esto convierte a Syndra en un copiloto de growth real. Sin esto, el usuario ve analytics pero tiene que interpretar y decidir él mismo.

#### 1.1 Modelo de aprendizaje persistente

##### A. Modelo `ContentLearningProfile`

Estado global de aprendizaje por workspace/canal.

```prisma
model ContentLearningProfile {
  id                    String    @id @default(cuid())
  workspaceId           String
  platform              Platform? // null = ALL
  audienceSegment       String?
  lastCalculatedAt      DateTime?
  dataWindowDays        Int       @default(30)
  minimumDataThreshold  Int       @default(5)
  confidenceScore       Float     @default(0)
  status                LearningStatus @default(LOW_DATA)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  workspace             Workspace @relation(fields: [workspaceId], references: [id])
  patternScores         ContentPatternScore[]
}

enum LearningStatus {
  ACTIVE
  LOW_DATA
  DISABLED
}
```

##### B. Modelo `ContentPatternScore`

Scores por dimensión (tema, tono, formato, CTA, día, hora, estilo visual, tipo de hook).

```prisma
model ContentPatternScore {
  id                  String    @id @default(cuid())
  learningProfileId   String
  dimensionType       PatternDimension
  dimensionValue      String
  sampleSize          Int       @default(0)
  avgEngagement       Float     @default(0)
  avgReach            Float     @default(0)
  avgSaves            Float     @default(0)
  avgComments         Float     @default(0)
  weightedScore       Float     @default(0)
  trendDirection      TrendDirection @default(FLAT)
  confidenceScore     Float     @default(0)
  updatedAt           DateTime  @updatedAt

  learningProfile     ContentLearningProfile @relation(fields: [learningProfileId], references: [id])
}

enum PatternDimension {
  THEME
  FORMAT
  TONE
  CTA
  HOUR
  DAY
  VISUAL_STYLE
  HOOK_TYPE
  LENGTH
}

enum TrendDirection {
  UP
  DOWN
  FLAT
}
```

##### C. Modelo `LearningDecisionLog`

Registra cada decisión automática de Syndra basada en aprendizaje.

```prisma
model LearningDecisionLog {
  id                String   @id @default(cuid())
  workspaceId       String
  editorialRunId    String?
  decisionType      DecisionType
  reasonSummary     String
  sourcePatternIds  Json     // IDs de patterns consultados
  beforeValue       String?
  afterValue        String?
  impactPrediction  String?
  createdAt         DateTime @default(now())

  workspace         Workspace    @relation(fields: [workspaceId], references: [id])
  editorialRun      EditorialRun? @relation(fields: [editorialRunId], references: [id])
}

enum DecisionType {
  CHOOSE_TONE
  CHOOSE_FORMAT
  CHOOSE_HOUR
  CHOOSE_THEME
  CHOOSE_CTA
  CHOOSE_HOOK
  AVOID_FATIGUE
}
```

#### 1.2 Lógica de negocio

| Paso | Descripción |
|------|-------------|
| **Recálculo** | Cada vez que se recolectan métricas → recalcular scores por dimensión |
| **Perfil resumido** | Generar: "tono mentor rinde +18%", "carousels +26%", "martes 19:00 mejor hora", etc. |
| **Consulta en estrategia** | Al generar ContentBrief → consultar scores para decidir formato, tono, hora, CTA, hook, tema |
| **Logging** | Cada decisión queda registrada en `LearningDecisionLog` |

#### 1.3 UI esperada

**Sección "Syndra aprendió sobre tu audiencia":**
- Top patrones ganadores con % de mejora
- Patrones flojos a evitar
- Cambios automáticos aplicados esta semana
- Nivel de confianza del aprendizaje (barra)

**Sección "Ajustes automáticos aplicados":**
- "Se priorizó carousel esta semana"
- "Se redujo el uso de CTA 'compra ahora'"
- "Se aumentó frecuencia de publicaciones educativas"

#### Checklist de implementación

- [x] Definir modelo `ContentLearningProfile` en Prisma
- [x] Definir modelo `ContentPatternScore` en Prisma
- [x] Definir modelo `LearningDecisionLog` en Prisma
- [x] Crear servicio `LearningService` con recálculo de scores
- [x] Crear cron de recálculo post-métricas
- [x] Modificar `StrategyService` para consultar learning profile
- [x] Ponderar formato, tono, CTA, horario desde scores
- [x] Registrar decisiones en `LearningDecisionLog`
- [x] Crear endpoint API para datos de aprendizaje
- [x] Crear página UI "Syndra aprendió"
- [x] Mostrar top patrones ganadores y flojos
- [x] Mostrar nivel de confianza del aprendizaje
- [x] Configuración: auto-apply vs recomendación
- [x] Sección en Settings con toggle, dimensiones, confianza mínima

---

### ✅ 2. Crear módulo visible "AI Content Strategist"

**Estado:** muy importante

**Qué es:** Transformar el motor de estrategia interno en un módulo de producto visible y vendible. Genera planes de contenido semanales/mensuales con recomendaciones accionables.

#### 2.1 Modelos

##### A. Modelo `StrategyPlan`

```prisma
model StrategyPlan {
  id                        String    @id @default(cuid())
  workspaceId               String
  periodType                PlanPeriod
  startDate                 DateTime
  endDate                   DateTime
  objective                 String?
  summary                   String?   @db.Text
  recommendedThemeMix       Json?
  recommendedFormatMix      Json?
  recommendedToneMix        Json?
  recommendedPostingWindows Json?
  recommendedCTAs           Json?
  trendReferences           Json?
  status                    StrategyPlanStatus @default(DRAFT)
  createdBy                 String    // SYSTEM o userId
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  workspace                 Workspace @relation(fields: [workspaceId], references: [id])
  recommendations           StrategyRecommendation[]
}

enum PlanPeriod {
  WEEKLY
  MONTHLY
}

enum StrategyPlanStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}
```

##### B. Modelo `StrategyRecommendation`

```prisma
model StrategyRecommendation {
  id               String   @id @default(cuid())
  strategyPlanId   String
  type             RecommendationType
  title            String
  description      String   @db.Text
  priorityScore    Float
  confidenceScore  Float
  recommendedAction String?
  sourceData       Json?
  createdAt        DateTime @default(now())

  strategyPlan     StrategyPlan @relation(fields: [strategyPlanId], references: [id])
}

enum RecommendationType {
  POST_COUNT
  FORMAT
  TONE
  HOUR
  THEME
  CTA
  TREND
  CAMPAIGN
}
```

#### 2.2 Generación

| Trigger | Descripción |
|---------|-------------|
| **Manual** | Botón "Generar plan" desde dashboard |
| **Automático semanal** | Cada lunes a las 7:00 AM |
| **Por tendencia** | Al detectar tendencia fuerte relevante |

#### 2.3 Inputs del plan

- Analytics recientes
- Learning profile
- Campañas activas
- Fuentes activas
- Objetivos del workspace
- Plan del usuario
- Tendencias detectadas

#### 2.4 Output esperado

Ejemplo de plan generado:
- 3 posts educativos
- 2 carousels
- 1 post de debate
- 1 reel de CTA
- Prioridad tema: IA aplicada a negocios
- Mejor horario: martes 20:00 y jueves 18:00
- CTA dominante: "comenta tu opinión"

#### 2.5 UI esperada

**Nueva sección `/dashboard/strategist`:**
- Recomendación de la semana (resumen ejecutivo)
- Temas sugeridos (ranked)
- Frecuencia sugerida
- Mix de formatos (visual)
- Oportunidades detectadas
- **Botón:** "Crear campaña desde recomendación"
- **Botón:** "Generar runs desde este plan"

#### Checklist de implementación

- [ ] Definir modelo `StrategyPlan` en Prisma
- [ ] Definir modelo `StrategyRecommendation` en Prisma
- [ ] Crear servicio `StrategyPlanService` (generación LLM del plan)
- [ ] Crear cron semanal de generación automática
- [ ] Crear endpoint API de planes estratégicos (CRUD + generar)
- [ ] Crear acción "crear campaña desde plan"
- [ ] Crear acción "generar runs desde plan"
- [ ] Crear página UI `/dashboard/strategist`
- [ ] Mostrar plan activo con recomendaciones
- [ ] Mostrar historial de planes anteriores

---

### ✅ 3. Implementar "Trend Detection" real y accionable

**Estado:** muy importante

**Qué es:** Detectar temas emergentes, rankearlos por relevancia y permitir actuar rápidamente.

#### 3.1 Modelo `TrendSignal`

```prisma
model TrendSignal {
  id                       String   @id @default(cuid())
  workspaceId              String
  themeLabel               String
  normalizedTopic          String
  sourceType               String
  sourceUrl                String?
  headline                 String?
  excerpt                  String?  @db.Text
  publishedAt              DateTime?
  noveltyScore             Float    @default(0)
  momentumScore            Float    @default(0)
  brandFitScore            Float    @default(0)
  engagementPotentialScore Float    @default(0)
  urgencyScore             Float    @default(0)
  finalScore               Float    @default(0)
  recommendedWindowHours   Int      @default(12)
  status                   TrendStatus @default(NEW)
  createdAt                DateTime @default(now())

  workspace                Workspace @relation(fields: [workspaceId], references: [id])
}

enum TrendStatus {
  NEW
  DISMISSED
  USED
  EXPIRED
}
```

#### 3.2 Servicio `TrendDetectionService`

| Responsabilidad | Detalle |
|-----------------|---------|
| Clusterizar artículos similares | Agrupar por similitud semántica (LLM) |
| Detectar repetición creciente | Tema que aparece más en últimas horas vs últimos días |
| Identificar keywords emergentes | Comparar 24h vs 48h vs 7d |
| Calcular score final | Ponderación de novedad + momentum + afinidad + urgencia |
| Crear TrendSignal | Si supera umbral, persistir señal |

#### 3.3 Alertas y acciones

- Alerta Telegram con datos de la tendencia
- Card en dashboard con score y ventana recomendada
- **Botón:** "Crear run ahora"
- **Botón:** "Agregar a estrategia semanal"

#### 3.4 UI esperada

**Panel "Tendencias detectadas" en `/dashboard/trends`:**

Cada tendencia muestra:
- Nombre del tema + score visual
- Por qué importa (resumen)
- Ventana recomendada (ej: "próximas 6 horas")
- Ángulo sugerido
- Acciones: usar / descartar / agregar a plan

#### Checklist de implementación

- [ ] Definir modelo `TrendSignal` en Prisma
- [ ] Crear servicio `TrendDetectionService`
- [ ] Implementar clusterización semántica (LLM)
- [ ] Implementar scoring multi-dimensión
- [ ] Crear cron de detección de tendencias (cada 4-6h)
- [ ] Integrar alertas Telegram para tendencias relevantes
- [ ] Crear endpoint API de tendencias (listar, usar, descartar)
- [ ] Crear página UI `/dashboard/trends`
- [ ] Acción "crear run desde tendencia"
- [ ] Acción "agregar tendencia a plan estratégico"

---

### ✅ 4. Agregar "Modos de Operación" / Autopilot Modes

**Estado:** crítico para UX

**Qué es:** Un concepto simple que define cómo opera Syndra: manual, semiautomático, con aprobación o autopilot total.

#### 4.1 Enum `OperationMode`

```prisma
enum OperationMode {
  MANUAL
  ASSISTED
  APPROVAL_REQUIRED
  FULL_AUTOPILOT
}
```

Aplicar como campo en: `Workspace`, `Campaign`, `Schedule`.

#### 4.2 Reglas por modo

| Modo | Investigación | Generación | Media | Publicación |
|------|:---:|:---:|:---:|:---:|
| **MANUAL** | ❌ | ❌ | ❌ | ❌ |
| **ASSISTED** | ✅ propone | ✅ propone | ✅ propone | ❌ requiere acción |
| **APPROVAL_REQUIRED** | ✅ auto | ✅ auto | ✅ auto | ⏳ espera aprobación |
| **FULL_AUTOPILOT** | ✅ auto | ✅ auto | ✅ auto | ✅ auto + resumen |

#### 4.3 Protecciones de autopilot

En `FULL_AUTOPILOT`, bloquear publicación automática si:
- ❌ No hay credenciales válidas
- ❌ Fuente tiene score de confianza bajo
- ❌ Compliance da riesgo medio/alto
- ❌ Tema está en blacklist
- ❌ Faltan assets mínimos (ej: imagen)

Permitir whitelist y blacklist de temas configurables.

#### 4.4 UI esperada

Selector claro en configuración de workspace/campaña:

```
🎛️ Modo de operación
○ Manual — Tú controlas todo
○ Asistido — Syndra propone, tú decides
○ Automático con aprobación — Syndra prepara todo, tú apruebas  ← recomendado
○ Piloto automático — Syndra opera sola con protecciones
```

#### Checklist de implementación

- [x] Agregar enum `OperationMode` en Prisma ✅ (FULLY_AUTOMATIC, APPROVAL_REQUIRED, MANUAL)
- [x] Agregar campo `operationMode` a `Workspace` ✅ (default APPROVAL_REQUIRED)
- [x] Agregar campo `operationMode` a `Campaign` (override opcional) ✅ (nullable, hereda de workspace)
- [ ] Agregar campo `operationMode` a `Schedule` (override opcional)
- [x] Modificar `SchedulerService` para respetar modo del workspace ✅ (filtra MANUAL)
- [x] Modificar `EditorialOrchestratorService` para respetar modo ✅ (auto-approve en FULLY_AUTOMATIC, cascade campaign→workspace)
- [ ] Modificar `PublisherService` — auto-publish solo en FULL_AUTOPILOT
- [ ] Implementar protecciones de autopilot (compliance, credenciales, fuente)
- [ ] Agregar whitelist/blacklist de temas por workspace
- [x] Crear UI selector de modo en `/dashboard/settings` ✅ (radio-style 3 modos)
- [ ] Crear UI selector de modo en formulario de campaña
- [ ] Documentar comportamiento de cada modo

---

### ✅ 5. Mejorar el embudo de activación inicial

**Estado:** crítico comercialmente

**Qué es:** Optimizar el recorrido de usuario nuevo hasta su primer valor real: registro → conecta canal → crea contenido → aprueba → publica.

#### 5.1 Modelo `OnboardingProgress`

```prisma
model OnboardingProgress {
  id                          String    @id @default(cuid())
  workspaceId                 String    @unique
  emailVerified               Boolean   @default(false)
  workspaceConfigured         Boolean   @default(false)
  brandConfigured             Boolean   @default(false)
  contentProfileConfigured    Boolean   @default(false)
  credentialsConfigured       Boolean   @default(false)
  socialConnected             Boolean   @default(false)
  telegramLinked              Boolean   @default(false)
  firstSourceAdded            Boolean   @default(false)
  firstRunCreated             Boolean   @default(false)
  firstPreviewSent            Boolean   @default(false)
  firstPublicationCompleted   Boolean   @default(false)
  completedAt                 DateTime?
  activationScore             Int       @default(0) // 0-100
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt

  workspace                   Workspace @relation(fields: [workspaceId], references: [id])
}
```

#### 5.2 Eventos de activación

Instrumentar y guardar:

| Evento | Trigger |
|--------|---------|
| `USER_REGISTERED` | Registro exitoso |
| `EMAIL_VERIFIED` | Click en link de verificación |
| `WORKSPACE_CONFIGURED` | Nombre + timezone + industria |
| `META_CONNECTED` | OAuth Meta completado |
| `TELEGRAM_LINKED` | Pairing exitoso |
| `FIRST_SOURCE_ADDED` | Primera fuente creada |
| `FIRST_CONTENT_GENERATED` | Primer run llega a CONTENT |
| `FIRST_POST_APPROVED` | Primera aprobación |
| `FIRST_POST_PUBLISHED` | Primera publicación exitosa |

#### 5.3 UI checklist visual

Barra de progreso en el dashboard con pasos claros:

```
Activación de tu cuenta  ████████░░░░  67%

✅ Verifica tu email
✅ Configura tu workspace
✅ Conecta Meta (Instagram/Facebook)
✅ Vincula Telegram
⬜ Agrega tu primera fuente
⬜ Genera tu primer contenido
⬜ Publica tu primer post
```

CTA por cada paso incompleto: "Completar ahora →"

#### 5.4 Nudges automáticos

| Condición | Acción |
|-----------|--------|
| 24h sin verificar email | Email reminder |
| 48h sin conectar canal | Banner in-app + email |
| Telegram no vinculado + primer run creado | Sugerencia context-aware |
| 7 días sin publicar | Email "Publica en 5 minutos" |
| Onboarding 80% pero no completado | Push final |

#### Checklist de implementación

- [ ] Definir modelo `OnboardingProgress` en Prisma
- [ ] Crear servicio `OnboardingTrackingService`
- [ ] Instrumentar eventos en registro, verificación, OAuth, etc.
- [ ] Actualizar `OnboardingProgress` en cada evento
- [x] Calcular `activationScore` dinámicamente ✅ (getStatus() devuelve 11 pasos + percent)
- [x] Crear endpoint API de progreso de onboarding ✅ (GET /api/onboarding/status)
- [x] Crear componente UI de checklist con barra de progreso ✅ (OnboardingChecklist)
- [x] Mostrar checklist en dashboard home (si no completado) ✅ (integrado en dashboard/page.tsx)
- [ ] Implementar nudges por email (Resend)
- [ ] Implementar banners in-app contextuales

---

## PRIORIDAD P1 — MUY RECOMENDADO EN EL PRIMER MES POST-LANZAMIENTO

---

### ✅ 6. A/B Testing editorial real

**Estado:** muy recomendable

**Qué es:** Comparar variantes de contenido (tono, CTA, formato) y aprender cuál funciona mejor. Alimenta directamente el learning loop.

#### 6.1 Modelos

##### A. Modelo `ContentExperiment`

```prisma
model ContentExperiment {
  id               String    @id @default(cuid())
  workspaceId      String
  editorialRunId   String?
  experimentType   ExperimentType
  hypothesis       String?   @db.Text
  status           ExperimentStatus @default(RUNNING)
  winnerVariantId  String?
  startedAt        DateTime  @default(now())
  endedAt          DateTime?

  workspace        Workspace @relation(fields: [workspaceId], references: [id])
  variants         ContentExperimentVariant[]
}

enum ExperimentType {
  TONE
  FORMAT
  CTA
  HOOK
  HOUR
  IMAGE_STYLE
}

enum ExperimentStatus {
  RUNNING
  COMPLETED
  CANCELLED
}
```

##### B. Modelo `ContentExperimentVariant`

```prisma
model ContentExperimentVariant {
  id               String   @id @default(cuid())
  experimentId     String
  label            String   // "A", "B"
  variantConfig    Json
  publicationId    String?
  performanceScore Float?
  isWinner         Boolean  @default(false)
  createdAt        DateTime @default(now())

  experiment       ContentExperiment @relation(fields: [experimentId], references: [id])
}
```

#### 6.2 MVP: 3 tipos iniciales

1. **Tono A vs Tono B** — mismo contenido, diferente tono
2. **CTA A vs CTA B** — mismo contenido, diferente call to action
3. **Post simple vs Carousel** — mismo tema, diferente formato

#### 6.3 Flujo

1. Usuario lanza experimento desde run existente
2. Sistema genera variante B automáticamente
3. Ambas se publican (en horarios similares o A/B split)
4. Tras ventana de medición (48h), se comparan métricas
5. Se declara ganador → resultado se envía al learning loop

#### Checklist de implementación

- [ ] Definir modelos `ContentExperiment` y `ContentExperimentVariant` en Prisma
- [ ] Crear servicio `ExperimentService` (crear, evaluar, cerrar)
- [ ] Generar variante B automáticamente vía LLM
- [ ] Comparar métricas tras ventana de medición
- [ ] Declarar ganador y alimentar `ContentPatternScore`
- [ ] Crear endpoint API de experimentos
- [ ] Crear UI para lanzar experimento desde editorial detail
- [ ] Crear UI de resultados de experimentos
- [ ] Mostrar historial de experimentos en analytics

---

### ✅ 7. Crear memoria de marca y fatiga de contenido

**Estado:** importante

**Qué es:** Evitar que Syndra se repita excesivamente. Detectar frases, temas, CTAs y tonos sobreusados.

#### 7.1 Modelos

##### A. Modelo `BrandMemory`

```prisma
model BrandMemory {
  id                 String   @id @default(cuid())
  workspaceId        String   @unique
  frequentPhrases    Json     @default("[]")  // [{phrase, count, lastUsed}]
  usedClaims         Json     @default("[]")
  usedCTAs           Json     @default("[]")
  overusedWords      Json     @default("[]")
  exploitedThemes    Json     @default("[]")
  lastAnalyzedAt     DateTime?
  updatedAt          DateTime @updatedAt

  workspace          Workspace @relation(fields: [workspaceId], references: [id])
}
```

##### B. Modelo `ContentFatigueScore`

```prisma
model ContentFatigueScore {
  id                   String   @id @default(cuid())
  workspaceId          String
  dimensionType        PatternDimension
  dimensionValue       String
  recentUsageCount     Int      @default(0)
  fatigueScore         Float    @default(0) // 0-100
  suggestedCooldownDays Int     @default(0)
  updatedAt            DateTime @updatedAt

  workspace            Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([workspaceId, dimensionType, dimensionValue])
}
```

#### 7.2 Lógica

| Regla | Efecto en estrategia |
|-------|---------------------|
| Tono saturado (fatigue > 70) | Bajar prioridad, sugerir alternativas |
| Tema sobreexplotado | Reducir frecuencia, cooldown automático |
| CTA repetido > 5 veces seguidas | Forzar variación |
| Claim ya usado | Evitar o reformular |
| Frase repetida > 3 veces | Alertar y bloquear |

#### Checklist de implementación

- [ ] Definir modelos `BrandMemory` y `ContentFatigueScore` en Prisma
- [ ] Crear servicio `BrandMemoryService` (análisis de contenido generado)
- [ ] Crear servicio `FatigueService` (cálculo de scores de saturación)
- [ ] Cron de actualización de memoria post-publicación
- [ ] Integrar fatiga en `StrategyService` — penalizar repetición
- [ ] Variar CTA/tono/tema cuando fatiga es alta
- [ ] Crear endpoint API de fatiga y memoria
- [ ] Crear UI alertas de saturación en dashboard
- [ ] Mostrar "temas en cooldown" en strategist

---

### ✅ 8. Plantillas de nicho mucho más profundas

**Estado:** muy útil comercialmente

**Qué es:** Modos más productizados por vertical que reducen fricción y personalizan la experiencia.

#### 8.1 Modelo `IndustryPlaybook`

```prisma
model IndustryPlaybook {
  id                   String   @id @default(cuid())
  industry             String   @unique
  displayName          String
  description          String?  @db.Text
  defaultThemes        Json     // [{name, keywords, priority}]
  defaultPersona       Json     // {brandName, tone, expertise, ...}
  defaultVisualStyle   Json     // {style, colors, fonts}
  recommendedSchedules Json     // [{day, hour}]
  recommendedFormats   Json     // [{format, weight}]
  recommendedCTAs      Json     // [string]
  recommendedSources   Json     // [{name, url, type}]
  exampleCampaigns     Json?    // [{name, objective, themes}]
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

#### 8.2 Verticales iniciales

| Vertical | Enfoque |
|----------|---------|
| **Inmobiliaria** | Propiedades, mercado, consejos comprador |
| **Ecommerce** | Productos, ofertas, social proof |
| **Creador/Youtuber** | Personal brand, engagement, comunidad |
| **Coach/Educación** | Autoridad, tips, testimonios |
| **Negocio local** | Proximidad, ofertas, eventos |
| **Comunidad Discord** | Engagement, debates, actualizaciones |
| **Tech/IA** | Noticias, análisis, tendencias |

#### 8.3 Integración

- Botón "Aplicar plantilla inteligente" en onboarding
- Rellena automáticamente: temas, persona, estilo visual, horarios, formatos, CTAs, fuentes sugeridas
- También disponible como "reset" desde settings: "Aplicar playbook de industria"

#### Checklist de implementación

- [x] Definir modelo `IndustryPlaybook` en Prisma ✅ (slug, name, icon, themes[], tones[], etc.)
- [x] Crear seed con 7 playbooks de verticales ✅ (8 verticales via POST /api/onboarding/seed-playbooks)
- [x] Crear servicio `PlaybookService` (aplicar, listar) ✅ (listIndustries, listPlaybooksFull, getPresets, seedPlaybooks)
- [x] Integrar en flujo de onboarding (botón "Aplicar plantilla") ✅ (onboarding page fetch de API)
- [ ] Crear acción "reset desde playbook" en settings
- [x] Crear endpoint API de playbooks ✅ (GET industries, GET playbooks, GET presets/:industry, POST seed)
- [x] UI de selección de playbook en onboarding (cards visuales) ✅ (dinámico desde API)
- [x] UI admin de gestión de playbooks ✅ (/dashboard/admin/playbooks con seed + detalle expandible)

---

### ✅ 9. Moderación avanzada de fuentes y claims

**Estado:** importante para calidad y reputación

**Qué es:** Cuidar calidad de fuentes, riesgo reputacional y trazabilidad de afirmaciones.

#### 9.1 Modelos

##### A. Modelo `SourceTrustProfile`

```prisma
model SourceTrustProfile {
  id              String   @id @default(cuid())
  workspaceId     String
  domain          String
  trustScore      Float    @default(50) // 0-100
  isWhitelisted   Boolean  @default(false)
  isBlacklisted   Boolean  @default(false)
  totalArticles   Int      @default(0)
  accuracyRate    Float?
  lastEvaluatedAt DateTime?
  notes           String?
  updatedAt       DateTime @updatedAt

  workspace       Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([workspaceId, domain])
}
```

##### B. Modelo `ClaimTrace`

```prisma
model ClaimTrace {
  id              String   @id @default(cuid())
  editorialRunId  String
  claim           String   @db.Text
  sourceUrl       String?
  sourceDomain    String?
  confidence      Float    @default(0)
  isVerified      Boolean  @default(false)
  createdAt       DateTime @default(now())

  editorialRun    EditorialRun @relation(fields: [editorialRunId], references: [id])
}
```

##### C. Modelo `ComplianceRule`

```prisma
model ComplianceRule {
  id              String   @id @default(cuid())
  workspaceId     String
  ruleType        String   // BLOCK_DOMAIN, REQUIRE_APPROVAL, SENSITIVE_TOPIC, etc.
  condition       Json     // {domain: "...", topic: "...", threshold: ...}
  action          String   // BLOCK, REQUIRE_APPROVAL, FLAG
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}
```

#### 9.2 Reglas de publicación

| Condición | Acción |
|-----------|--------|
| Fuente con score < 30 | Aprobación humana obligatoria |
| Tema sensible detectado | Bloquear autopilot |
| Afirmación sin trazabilidad | Bajar score de confianza |
| Dominio en blacklist | Bloquear completamente |

#### Checklist de implementación

- [ ] Definir modelos `SourceTrustProfile`, `ClaimTrace`, `ComplianceRule` en Prisma
- [ ] Crear servicio `SourceTrustService` (scoring de dominios)
- [ ] Crear servicio `ClaimTraceService` (trazabilidad de afirmaciones)
- [ ] Evaluar confianza de fuente en etapa RESEARCH
- [ ] Integrar trust score en decisión de autopilot
- [ ] Crear endpoint API de gestión de fuentes confiables
- [ ] Crear UI de whitelist/blacklist de dominios
- [ ] Mostrar trazabilidad de claims en detalle editorial

---

### ✅ 10. Panel self-serve de afiliados / partners

**Estado:** importante para crecimiento

**Qué es:** Experiencia completa para que un partner/afiliado opere sin intervención del admin.

#### 10.1 Pantallas nuevas

| Ruta | Función |
|------|---------|
| `/dashboard/partner` | Dashboard de partner con KPIs |
| `/dashboard/partner/payouts` | Historial y estado de pagos |
| `/dashboard/partner/assets` | Kit promocional descargable |

#### 10.2 Datos mostrados

- Código referido personal
- URL personalizada con UTM
- Cantidad de clics (tracking)
- Leads registrados
- Clientes que pagaron
- MRR generado por referidos
- Comisión acumulada
- Pagos emitidos y pendientes

#### 10.3 Extras

- Generación automática de links UTM
- Kit promocional: copys sugeridos, banners, tutorial
- Política de payout visible
- Notificaciones de nuevas conversiones

#### Checklist de implementación

- [x] Crear endpoint API de stats de afiliado (clics, leads, conversiones, MRR) ✅ (GET /api/partner/dashboard con @Roles('COLLABORATOR'))
- [ ] Implementar tracking de clics en links referidos
- [x] Crear página `/dashboard/partner` con KPIs ✅ (4 KPI cards + referrals table + payouts table)
- [ ] Crear página `/dashboard/partner/payouts` con historial
- [ ] Crear página `/dashboard/partner/assets` con kit promocional
- [ ] Generación automática de URLs con UTM
- [ ] Crear assets promocionales (copys, banners)
- [ ] Mostrar política de payout

---

## PRIORIDAD P2 — IMPORTANTES PARA ESCALAR BIEN

---

### ✅ 11. Recomendador de frecuencia y mix de formatos

**Qué es:** Que Syndra sugiera cuánto publicar y de qué tipo, basado en datos.

#### Inputs

- Performance histórica
- Capacidad del plan
- Actividad del canal
- Saturación de audiencia (fatigue scores)
- Objetivos activos

#### Output esperado

```
Recomendación semanal:
• 4 posts por semana
• 2 carousels (educativo + autoridad)
• 1 reel (CTA)
• 1 post debate
• CTA principal: suave/engagement
```

#### Checklist de implementación

- [ ] Crear lógica de recomendación de frecuencia en `StrategyPlanService`
- [ ] Calcular frecuencia óptima por canal
- [ ] Calcular mix de formatos ideal
- [ ] Integrar en plan estratégico semanal
- [ ] Mostrar recomendación en UI `/dashboard/strategist`

---

### ✅ 12. Alertas proactivas inteligentes

**Qué es:** Alertas al usuario antes de que algo importante pase o falle.

#### 12.1 Modelo `WorkspaceAlert`

```prisma
model WorkspaceAlert {
  id              String    @id @default(cuid())
  workspaceId     String
  type            AlertType
  severity        AlertSeverity
  title           String
  message         String    @db.Text
  suggestedAction String?
  status          AlertStatus @default(ACTIVE)
  dismissedAt     DateTime?
  createdAt       DateTime  @default(now())

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}

enum AlertType {
  TOKEN_EXPIRING
  LOW_ACTIVITY
  ENGAGEMENT_DROP
  TREND_DETECTED
  PUBLISH_ERROR
  CREDENTIALS_BROKEN
  CAMPAIGN_NO_SOURCES
  ONBOARDING_STALLED
  HIGH_FATIGUE
  PLAN_LIMIT_NEAR
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AlertStatus {
  ACTIVE
  DISMISSED
  RESOLVED
}
```

#### 12.2 Alertas a implementar

| Alerta | Severidad | Trigger |
|--------|-----------|---------|
| Meta token por vencer (< 7 días) | CRITICAL | Cron diario |
| Telegram no vinculado | WARNING | Post-onboarding |
| Engagement cayó > 20% | WARNING | Post-analytics |
| Tendencia relevante detectada | INFO | Trend detection |
| Errores de publicación repetidos | CRITICAL | Post-publish |
| 7 días sin publicar | WARNING | Cron diario |
| Campaña activa sin fuentes | WARNING | Post-campaign create |
| Límite del plan al 80% | INFO | Post-usage check |

#### Checklist de implementación

- [x] Definir modelo `WorkspaceAlert` en Prisma ✅
- [x] Crear servicio `AlertService` (crear, resolver, listar) ✅
- [x] Implementar cron de verificación de alertas (diario) ✅ (8AM, 5 tipos)
- [x] Generar alertas desde eventos del sistema ✅ (LOW_ACTIVITY, ENGAGEMENT_DROP, PUBLISH_ERROR, ONBOARDING_STALLED, CAMPAIGN_NO_SOURCES)
- [x] Crear endpoint API de alertas ✅ (GET/PATCH /api/alerts)
- [x] Crear componente UI de alertas en dashboard ✅ (/dashboard/alerts con filtros)
- [x] Permitir dismiss de alertas ✅
- [x] Enviar alertas críticas por Telegram ✅

---

### ✅ 13. Observabilidad operativa y de negocio

**Qué es:** Dashboard interno de salud real del SaaS, no solo health técnico.

#### 13.1 Métricas a trackear

| Métrica | Tipo |
|---------|------|
| Runs creados (por día) | Operativa |
| Runs fallidos por etapa | Operativa |
| Ratio de aprobación | Calidad |
| Ratio de rechazo | Calidad |
| Tiempo promedio idea → publicación | Performance |
| Tiempo promedio de revisión | Performance |
| Tasa de regeneración | Calidad |
| Errores por proveedor | Infraestructura |
| Workspaces inactivos | Negocio |
| Workspaces con credenciales rotas | Salud |
| Riesgo de churn agregado | Negocio |

#### Checklist de implementación

- [x] Crear modelo `OperationalMetric` para métricas diarias ✅
- [x] Crear servicio `ObservabilityService` (cálculo de métricas) ✅
- [x] Crear cron diario de cálculo de métricas ✅ (2AM, 11 métricas)
- [x] Crear página admin `/dashboard/admin/operations` ✅ (KPIs + sparklines + tendencias)
- [x] Gráficas de tendencias por métrica ✅ (sparklines 14d)
- [ ] Alertas por umbrales (ej: fallos > 20%)

---

### ✅ 14. Detección de riesgo de churn

**Qué es:** Identificar usuarios que probablemente cancelen.

#### 14.1 Modelo `ChurnRiskSignal`

```prisma
model ChurnRiskSignal {
  id              String   @id @default(cuid())
  workspaceId     String   @unique
  riskScore       Float    @default(0) // 0-100
  reasons         Json     @default("[]") // [{reason, weight}]
  lastCalculatedAt DateTime?
  status          String   @default("MONITORING") // MONITORING, AT_RISK, CHURNED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}
```

#### 14.2 Señales de riesgo

| Señal | Peso |
|-------|------|
| No publica hace > 14 días | Alto |
| No completó onboarding | Alto |
| Conectó pero nunca aprobó | Medio |
| Engagement muy bajo sostenido | Medio |
| Alto nivel de fallos de publicación | Medio |
| Casi no usa el producto (< 2 logins/semana) | Alto |
| Múltiples regeneraciones sin aprobar | Bajo |

#### Checklist de implementación

- [x] Definir modelo `ChurnRiskSignal` en Prisma ✅
- [x] Crear servicio `ChurnDetectionService` ✅
- [x] Implementar reglas de scoring con pesos ✅ (6 señales, score 0-100)
- [x] Crear cron semanal de evaluación de churn ✅ (domingos 6AM)
- [x] Mostrar risk score en admin panel por usuario ✅ (/dashboard/admin/churn)
- [ ] Crear alertas admin para workspaces AT_RISK
- [x] Mostrar lista de "usuarios en riesgo" en admin ✅ (tabla con filtros + evaluación manual)

---

### ✅ 15. Resumen ejecutivo de valor para el usuario

**Qué es:** Vista mensual que traduce complejidad en impacto percibido.

#### 15.1 Contenido del resumen

| Dato | Ejemplo |
|------|---------|
| Publicaciones creadas este mes | 24 publicaciones |
| Tiempo estimado ahorrado | ~18 horas |
| Mejores contenidos | Top 3 por engagement |
| Tendencia aprovechada | "Agentes IA" — +340% reach |
| Crecimiento estimado | +12% engagement vs mes anterior |
| Canales activos | Instagram, Facebook, Threads |
| Recomendaciones de foco | "Aumentar carousels, reducir posts simples" |

#### Checklist de implementación

- [x] Crear servicio `ExecutiveSummaryService` (cálculo mensual) ✅ (getExecutiveSummary() en AnalyticsService)
- [x] Crear endpoint API de resumen ejecutivo ✅ (GET /api/analytics/summary)
- [x] Crear componente UI de resumen en dashboard home ✅ (ExecutiveSummary component)
- [x] Enviar resumen mensual por email ✅ (cron 1° de mes, email HTML dark theme)
- [x] Enviar resumen mensual por Telegram ✅ (cron 1° de mes, por workspace con owner chatId)

---

## PRIORIDAD P3 — EVOLUCIÓN PRO / ENTERPRISE

---

### ✅ 16. Benchmarking entre canales y cuentas

**Qué es:** Comparar performance entre plataformas o cuentas conectadas.

**Ejemplo de insights:**
- Instagram funciona mejor para autoridad
- Discord funciona mejor para comunidad
- Facebook mejor para CTA de tráfico

#### Checklist de implementación

- [ ] Crear servicio `BenchmarkService` (comparación cross-platform)
- [ ] Agregar dashboard comparativo por plataforma
- [ ] Comparar por formato, objetivo, campaña
- [ ] Mostrar recomendaciones de foco por canal

---

### ✅ 17. Workflow editorial colaborativo avanzado

**Qué es:** Colaboración más rica que OWNER/EDITOR/VIEWER.

#### 17.1 Modelos

```prisma
model EditorialComment {
  id              String   @id @default(cuid())
  editorialRunId  String
  userId          String
  content         String   @db.Text
  parentId        String?  // hilos
  createdAt       DateTime @default(now())

  editorialRun    EditorialRun @relation(fields: [editorialRunId], references: [id])
  user            User         @relation(fields: [userId], references: [id])
  parent          EditorialComment? @relation("CommentThread", fields: [parentId], references: [id])
  replies         EditorialComment[] @relation("CommentThread")
}

model EditorialAssignment {
  id              String   @id @default(cuid())
  editorialRunId  String
  assignedUserId  String
  role            String   // REVIEWER, EDITOR, APPROVER
  status          String   @default("PENDING") // PENDING, ACCEPTED, COMPLETED
  createdAt       DateTime @default(now())

  editorialRun    EditorialRun @relation(fields: [editorialRunId], references: [id])
  assignedUser    User         @relation(fields: [assignedUserId], references: [id])
}

model ApprovalStep {
  id              String   @id @default(cuid())
  editorialRunId  String
  stepOrder       Int
  approverUserId  String
  status          String   @default("PENDING") // PENDING, APPROVED, REJECTED
  comment         String?
  decidedAt       DateTime?
  createdAt       DateTime @default(now())

  editorialRun    EditorialRun @relation(fields: [editorialRunId], references: [id])
  approver        User         @relation(fields: [approverUserId], references: [id])
}
```

#### Checklist de implementación

- [ ] Definir modelos `EditorialComment`, `EditorialAssignment`, `ApprovalStep` en Prisma
- [ ] Crear servicio de comentarios editoriales
- [ ] Crear servicio de asignaciones
- [ ] Crear flujo de multi-aprobación
- [ ] Crear UI de comentarios en detalle editorial
- [ ] Crear UI de asignación de revisores
- [ ] Notificaciones por asignación y comentario

---

### ✅ 18. Versionado de estrategia

**Qué es:** Guardar evolución de planes estratégicos y comparar resultados por versión.

#### Checklist de implementación

- [ ] Agregar campo `version` a `StrategyPlan`
- [ ] Guardar historial de planes por workspace
- [ ] Crear UI de comparación entre versiones
- [ ] Medir impacto post-plan (métricas del período)

---

### ✅ 19. Playbooks reutilizables

**Qué es:** Que usuarios pro puedan guardar fórmulas exitosas como recetas reutilizables.

#### 19.1 Modelo `ContentPlaybook`

```prisma
model ContentPlaybook {
  id              String   @id @default(cuid())
  workspaceId     String
  name            String
  description     String?  @db.Text
  rules           Json     // reglas de contenido
  formatMix       Json     // proporción de formatos
  basePrompts     Json?    // prompts base personalizados
  scheduleConfig  Json?    // horarios preferidos
  preferredCTAs   Json?    // CTAs favoritos
  visualStyles    Json?    // estilos visuales
  sourceTypes     Json?    // tipos de fuentes
  isPublic        Boolean  @default(false)
  usageCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}
```

#### Checklist de implementación

- [ ] Definir modelo `ContentPlaybook` en Prisma
- [ ] Crear servicio `PlaybookService` (save, apply, share)
- [ ] Crear acción "guardar como playbook" desde campaña exitosa
- [ ] Crear UI de biblioteca de playbooks
- [ ] Permitir aplicar playbook a nueva campaña
- [ ] Marketplace futuro de playbooks compartidos

---

### ✅ 20. Predicción de performance más avanzada

**Qué es:** Evolucionar el scoring IA actual con más señales y mejores explicaciones.

#### Evolución

| Mejora | Detalle |
|--------|---------|
| Más features históricas | Trending topics, día festivo, estacionalidad |
| Modelos por canal | Score distinto para IG vs FB vs Threads |
| Modelos por industria | Benchmarks por vertical |
| Score con explicación | "Este post tiene 72% porque: carousel +15%, martes +8%, tono mentor +12%, CTA débil -5%" |
| Accionable | "Para subir 15%: cambiar CTA a pregunta y publicar a las 19h" |

#### Checklist de implementación

- [ ] Agregar features contextuales al scoring (día festivo, estacionalidad)
- [ ] Implementar scoring por canal separado
- [ ] Implementar benchmarks por industria
- [ ] Generar explicación desglosada del score
- [ ] Generar recomendaciones accionables ("qué cambiar para subir X%")
- [ ] Crear UI de score con desglose visual

---

### ✅ 21. Generación de Video Escalable para Reels y Publicaciones

**Estado:** feature final del pipeline de video / crítico para diferenciación

**Qué es:** Evolucionar el motor de video actual (HeyGen avatar) a un sistema de generación de video multi-tier que soporte reels, stories y publicaciones con video de forma escalable y económicamente sostenible.

**Por qué importa:** El video es el formato de mayor alcance en Instagram, Facebook y Threads. Hoy Syndra ya genera avatar videos con HeyGen, pero depende 100% de una API de pago cara. Esta mejora introduce un pipeline de video escalonado que permite operar desde MVP barato hasta producción seria.

#### 21.1 Estrategia de 3 tiers

| Tier | Nombre | Cuándo usarlo | Proveedores | Costo |
|------|--------|---------------|-------------|-------|
| **Tier 1** | MVP / Validación | Lanzamiento, planes Free/Starter | Pika, Luma Dream Machine | Bajo (API con créditos) |
| **Tier 2** | Semi-gratis operable | Planes Pro, volumen medio | Edge TTS + Stable Video Diffusion / Wan / Hunyuan (GPU propia) | Medio (infra GPU) |
| **Tier 3** | Producción comercial | Enterprise, máxima calidad | HeyGen + ElevenLabs + GPU dedicada | Alto (APIs premium + infra) |

#### 21.2 Tier 1 — MVP / Validación

**Objetivo:** Lanzar video como feature limitada por plan o créditos sin infraestructura GPU pesada.

**Proveedores:**
- **Pika** — generación de video desde texto/imagen, estilo creativo
- **Luma Dream Machine** — image-to-video de alta calidad

**Flujo:**
1. Syndra genera imagen (existente) o toma imagen del editorial run
2. Se envía a Pika/Luma como image-to-video con prompt de movimiento
3. Se recibe video renderizado (async, polling de estado)
4. Upload a Cloudinary → listo para publicar como reel/video post

**Limitaciones:**
- Gated por plan: FREE = 0 videos, STARTER = 3/mes, PRO = 15/mes
- Cola de baja prioridad (no tiempo real)
- Watermark en plan FREE si se habilita preview

#### 21.3 Tier 2 — Semi-gratis operable

**Objetivo:** Generar video completo (guion + voz + visual + animación) con costo mínimo operativo.

**Pipeline completo:**

```
📝 Guion (LLM existente)
    ↓
🔊 Voz (Edge TTS — gratis, local)
    ↓
🖼️ Imagen/Carousel (pipeline existente)
    ↓
🎬 Animación image-to-video
    ├── Stable Video Diffusion (SVD) — open source
    ├── Wan 2.1 — open source, alta calidad
    └── Hunyuan Video — open source, Tencent
    ↓
🎞️ Composición final (ffmpeg: video + audio + subtítulos)
    ↓
☁️ Upload Cloudinary → Publicar
```

**Infra requerida:**
- Máquina GPU separada (ej: RunPod, Vast.ai, o servidor propio con RTX 4090)
- API interna tipo worker: recibe job → renderiza → devuelve URL
- Cola `video_render_jobs` para procesamiento async

**Modelos open source soportados:**

| Modelo | Tipo | Ventaja |
|--------|------|--------|
| **Stable Video Diffusion (SVD)** | Image-to-video | Estable, bien documentado, comunidad activa |
| **Wan 2.1** | Text/Image-to-video | Alta calidad, open source por Alibaba |
| **Hunyuan Video** | Text/Image-to-video | Open source por Tencent, buen motion |

#### 21.4 Tier 3 — Producción comercial

**Objetivo:** Máxima calidad para clientes Enterprise.

**Stack:**
- **HeyGen** para avatar videos (ya existente)
- **ElevenLabs** para voz premium (ya existente)
- **GPU dedicada** con modelos fine-tuneados por vertical
- **Pika/Runway** para efectos avanzados

**Nota importante:** No contar con planes "gratis" de APIs como base estable. Los planes free suelen venir con créditos limitados, colas, watermarks o restricciones de uso que pueden cambiar. Lo gratis sirve para probar mercado; para escalar, se necesita pago o infraestructura propia.

#### 21.5 Modelos de datos

##### A. Modelo `VideoRenderJob` (extensión del existente)

```prisma
model VideoRenderJob {
  id              String    @id @default(cuid())
  workspaceId     String
  editorialRunId  String?
  provider        VideoProvider
  tier            VideoTier
  inputType       VideoInputType
  inputPayload    Json      // {imageUrl, prompt, script, voiceConfig, ...}
  outputUrl       String?
  thumbnailUrl    String?
  durationSeconds Int?
  aspectRatio     String    @default("9:16")
  status          VideoJobStatus @default(QUEUED)
  externalJobId   String?   // ID del provider externo
  errorMessage    String?
  retryCount      Int       @default(0)
  creditsUsed     Int       @default(1)
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime  @default(now())

  workspace       Workspace    @relation(fields: [workspaceId], references: [id])
  editorialRun    EditorialRun? @relation(fields: [editorialRunId], references: [id])
}

enum VideoProvider {
  HEYGEN
  PIKA
  LUMA
  SVD_LOCAL
  WAN_LOCAL
  HUNYUAN_LOCAL
  EDGE_TTS_COMPOSE
  MOCK
}

enum VideoTier {
  MVP        // Pika/Luma API
  SELFHOST   // GPU propia + open source
  PREMIUM    // HeyGen + ElevenLabs
}

enum VideoInputType {
  IMAGE_TO_VIDEO
  TEXT_TO_VIDEO
  SCRIPT_WITH_VOICE
  AVATAR_TALKING
  CAROUSEL_ANIMATION
}

enum VideoJobStatus {
  QUEUED
  RENDERING
  COMPOSING
  UPLOADING
  COMPLETED
  FAILED
  CANCELLED
}
```

##### B. Modelo `VideoCredit` (control de uso por plan)

```prisma
model VideoCredit {
  id              String    @id @default(cuid())
  workspaceId     String
  totalCredits    Int       @default(0)
  usedCredits     Int       @default(0)
  periodStart     DateTime
  periodEnd       DateTime
  source          String    // PLAN, ADDON, PROMO
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}
```

#### 21.6 Adaptadores a crear en `@automatismos/media`

| Adaptador | Ubicación | Descripción |
|-----------|-----------|-------------|
| `PikaVideoAdapter` | `packages/media/src/adapters/pika-video.ts` | Image/text-to-video via Pika API |
| `LumaVideoAdapter` | `packages/media/src/adapters/luma-video.ts` | Image-to-video via Luma Dream Machine API |
| `LocalGPUVideoAdapter` | `packages/media/src/adapters/local-gpu-video.ts` | Proxy a worker GPU propio (SVD/Wan/Hunyuan) |
| `CompositeVideoAdapter` | `packages/media/src/adapters/composite-video.ts` | Composición ffmpeg: video + audio + subtítulos |

#### 21.7 Servicio `VideoTierRouter`

Lógica de selección de tier automática:

```typescript
// Pseudocódigo
function selectVideoTier(workspace, plan, request): VideoTier {
  // 1. Si el workspace tiene GPU propia configurada → SELFHOST
  if (workspace.hasLocalGPU && request.type !== 'AVATAR_TALKING') return 'SELFHOST';
  
  // 2. Si plan Enterprise o tiene créditos premium → PREMIUM  
  if (plan.tier === 'ENTERPRISE' || request.preferPremium) return 'PREMIUM';
  
  // 3. Si tiene créditos de video disponibles → MVP
  if (videoCredits.remaining > 0) return 'MVP';
  
  // 4. Sin créditos → rechazar o encolar para cuando haya
  throw new VideoCreditsExhausted();
}
```

#### 21.8 Integración con pipeline editorial

| Punto de integración | Cambio |
|---------------------|--------|
| `editorial-orchestrator` | Si el brief indica formato `reel` o `video`, encolar `VideoRenderJob` en vez de solo imagen |
| `publisher.service` | Detectar si hay video asset → publicar como reel (IG), video post (FB), video (Threads) |
| `channel-formats-picker` | Agregar formato "Reel" y "Video" a las opciones de canal |
| Manual run form | Opción de "incluir video" con selector de tier |
| Telegram preview | Preview con thumbnail + botón "Ver video" |

#### 21.9 UI esperada

**En `/dashboard/videos`** (existente, extender):
- Selector de tier preferido por workspace
- Medidor de créditos de video restantes
- Estado de GPU local (si configurada)
- Historial de renders con proveedor y costo

**En editorial detail** (existente, extender):
- Botón "Generar como Reel" disponible en runs con imagen
- Preview de video inline
- Selector de estilo de animación (zoom, pan, dynamic)

**En configuración** (existente, extender):
- Config de GPU local: URL del worker, API key, modelos disponibles
- Preferencia de tier por defecto
- Límites de créditos visibles

#### Checklist de implementación

**Tier 1 — MVP (lanzamiento):**
- [ ] Definir modelos `VideoRenderJob` y `VideoCredit` en Prisma
- [ ] Crear `PikaVideoAdapter` (image-to-video via API)
- [ ] Crear `LumaVideoAdapter` (image-to-video via API)
- [ ] Crear servicio `VideoTierRouter` (selección de tier)
- [ ] Crear servicio `VideoCreditService` (control de créditos por plan)
- [ ] Integrar generación de video en pipeline editorial (formato reel)
- [ ] Extender publisher para publicar reels en IG/FB/Threads
- [ ] Agregar formato Reel/Video al `channel-formats-picker`
- [ ] UI de créditos de video en `/dashboard/videos`
- [ ] Gate por plan: verificar créditos antes de renderizar

**Tier 2 — Self-hosted (post-lanzamiento):**
- [ ] Crear `LocalGPUVideoAdapter` (proxy a worker GPU)
- [ ] Crear worker GPU con API REST (SVD/Wan/Hunyuan)
- [ ] Crear `CompositeVideoAdapter` (ffmpeg: video + Edge TTS audio + SRT)
- [ ] Crear cola `video_render_jobs` en pgmq
- [ ] Pipeline completo: guion → voz → imagen → animación → composición
- [ ] UI de configuración de GPU local en settings
- [ ] Soporte multi-modelo: selector SVD vs Wan vs Hunyuan

**Tier 3 — Premium (enterprise):**
- [ ] Integrar con pipeline HeyGen existente via tier routing
- [ ] Agregar ElevenLabs como opción de voz premium en tier router
- [ ] Fine-tuning de modelos por vertical (opcional)
- [ ] Métricas de costo por render y ROI de video

---

## 📋 ORDEN RECOMENDADO DE DESARROLLO

### Fase 1 — Motor de Aprendizaje + Strategist + Modos
> ⏱️ Sprint intenso

| # | Tarea |
|---|-------|
| 1 | `ContentLearningProfile` + `ContentPatternScore` + `LearningDecisionLog` |
| 2 | `StrategyPlan` + `StrategyRecommendation` |
| 3 | `OperationMode` enum + campo en Workspace/Campaign |
| 4 | Modificar `StrategyService` para consultar learning |
| 5 | UI "Syndra aprendió" + UI "AI Content Strategist" |
| 6 | UI selector de modo operativo |

### Fase 2 — Trend Detection + Activación
> ⏱️ Sprint medio

| # | Tarea |
|---|-------|
| 7 | `TrendSignal` + `TrendDetectionService` |
| 8 | `OnboardingProgress` + eventos de activación |
| 9 | Panel de tendencias + alertas Telegram |
| 10 | Checklist visual de onboarding + nudges |

### Fase 3 — A/B Testing + Memoria + Templates
> ⏱️ Sprint medio

| # | Tarea |
|---|-------|
| 11 | `ContentExperiment` + `ContentExperimentVariant` |
| 12 | `BrandMemory` + `ContentFatigueScore` |
| 13 | `IndustryPlaybook` + seed de 7 verticales |
| 14 | Integrar fatiga en brief + aplicar playbooks en onboarding |

### Fase 4 — Moderación + Afiliados
> ⏱️ Sprint medio

| # | Tarea |
|---|-------|
| 15 | `SourceTrustProfile` + `ClaimTrace` + `ComplianceRule` |
| 16 | Protecciones de autopilot (safety rules) |
| 17 | Dashboard self-serve de afiliados (3 páginas) |
| 18 | Assets y UTMs para partners |

### Fase 5 — Alertas + Observabilidad + Churn
> ⏱️ Sprint medio

| # | Tarea |
|---|-------|
| 19 | `WorkspaceAlert` + servicio de alertas |
| 20 | Dashboard de salud operativa (admin) |
| 21 | `ChurnRiskSignal` + reglas de detección |
| 22 | Resumen ejecutivo mensual |

### Fase 6 — Video Escalable
> ⏱️ Sprint medio-largo

| # | Tarea |
|---|-------|
| 23 | `VideoRenderJob` + `VideoCredit` + modelos Prisma |
| 24 | `PikaVideoAdapter` + `LumaVideoAdapter` (Tier 1 MVP) |
| 25 | `VideoTierRouter` + `VideoCreditService` |
| 26 | Integrar video en pipeline editorial + publisher (reels) |
| 27 | UI de créditos + formato reel en channel picker |
| 28 | `LocalGPUVideoAdapter` + worker GPU (Tier 2 self-hosted) |
| 29 | `CompositeVideoAdapter` (ffmpeg: video + voz + subtítulos) |

### Fase 7 — Pro/Enterprise
> ⏱️ Sprint largo

| # | Tarea |
|---|-------|
| 30 | Benchmarking entre canales |
| 31 | `EditorialComment` + `EditorialAssignment` + `ApprovalStep` |
| 32 | Versionado de `StrategyPlan` |
| 33 | `ContentPlaybook` reutilizables |
| 34 | Scoring predictivo avanzado |
| 35 | Tier 3 video premium (HeyGen + ElevenLabs via tier router) |

---

## 📊 Resumen del Plan

| Prioridad | Features | Descripción |
|-----------|----------|-------------|
| **P0** | 5 features | Learning loop, Strategist, Trends, Autopilot modes, Onboarding |
| **P1** | 5 features | A/B testing, Fatiga, Playbooks nicho, Source trust, Afiliados |
| **P2** | 5 features | Recomendador frecuencia, Alertas, Observabilidad, Churn, Resumen |
| **P3** | 5 features | Benchmarking, Colaboración, Versionado, Playbooks, Scoring avanzado |
| **PV** | 1 feature | Video escalable multi-tier (MVP → Self-hosted → Premium) |
| **Total** | **21 features** | **~66 tareas de checklist** · **~35 fases de desarrollo** |

### Modelos nuevos a crear

| Modelo | Prioridad |
|--------|-----------|
| `ContentLearningProfile` | P0 |
| `ContentPatternScore` | P0 |
| `LearningDecisionLog` | P0 |
| `StrategyPlan` | P0 |
| `StrategyRecommendation` | P0 |
| `TrendSignal` | P0 |
| `OnboardingProgress` | P0 |
| `ContentExperiment` | P1 |
| `ContentExperimentVariant` | P1 |
| `BrandMemory` | P1 |
| `ContentFatigueScore` | P1 |
| `IndustryPlaybook` | P1 |
| `SourceTrustProfile` | P1 |
| `ClaimTrace` | P1 |
| `ComplianceRule` | P1 |
| `WorkspaceAlert` | P2 |
| `OperationalMetric` | P2 |
| `ChurnRiskSignal` | P2 |
| `EditorialComment` | P3 |
| `EditorialAssignment` | P3 |
| `ApprovalStep` | P3 |
| `ContentPlaybook` | P3 |
| `VideoRenderJob` | PV |
| `VideoCredit` | PV |

> **24 modelos nuevos** sumados a los 38 existentes = **62 modelos totales**

---

> ⚠️ **REGLA DE ORO:** Ninguna de estas mejoras debe romper funcionalidad existente. Todo se construye como extensión, no como reemplazo. Los servicios actuales se modifican de forma aditiva — nuevas consultas, nuevos parámetros opcionales, nuevas ramas de lógica — sin alterar los flujos que ya funcionan.
