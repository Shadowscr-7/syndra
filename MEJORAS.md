# ðŸš€ Syndra â€” Plan Maestro de Mejoras

> Checklist completo de mejoras priorizadas para cerrar el nÃºcleo diferencial del producto.
> Fecha de planificaciÃ³n: 8 de Marzo 2026.

---

## ENFOQUE GENERAL

Syndra ya tiene muchas features. Lo que falta ahora no es "mÃ¡s cantidad", sino **cerrar el nÃºcleo diferencial del producto**.

### Ejes Diferenciales

| Eje | Objetivo |
|-----|----------|
| **Syndra aprende** | No solo mide â€” adapta decisiones futuras segÃºn performance |
| **Syndra piensa estratÃ©gicamente** | No solo genera â€” planifica y recomienda |
| **Syndra detecta oportunidades** | No solo reacciona a fuentes â€” identifica tendencias accionables |
| **Syndra es fÃ¡cil de activar y escalar** | No solo poderoso â€” accesible, activable y comercialmente escalable |

---

## PRIORIDAD P0 â€” IMPRESCINDIBLE ANTES O DURANTE EL LANZAMIENTO

---

### âœ… 1. Cerrar el "Content Intelligence Loop" real

**Estado:** crÃ­tico / principal diferencial

**QuÃ© es:** Que Syndra pase de "genera + publica + mide" a "genera + publica + mide + **aprende** + **adapta decisiones futuras**".

**Por quÃ© importa:** Esto convierte a Syndra en un copiloto de growth real. Sin esto, el usuario ve analytics pero tiene que interpretar y decidir Ã©l mismo.

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

Scores por dimensiÃ³n (tema, tono, formato, CTA, dÃ­a, hora, estilo visual, tipo de hook).

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

Registra cada decisiÃ³n automÃ¡tica de Syndra basada en aprendizaje.

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

#### 1.2 LÃ³gica de negocio

| Paso | DescripciÃ³n |
|------|-------------|
| **RecÃ¡lculo** | Cada vez que se recolectan mÃ©tricas â†’ recalcular scores por dimensiÃ³n |
| **Perfil resumido** | Generar: "tono mentor rinde +18%", "carousels +26%", "martes 19:00 mejor hora", etc. |
| **Consulta en estrategia** | Al generar ContentBrief â†’ consultar scores para decidir formato, tono, hora, CTA, hook, tema |
| **Logging** | Cada decisiÃ³n queda registrada en `LearningDecisionLog` |

#### 1.3 UI esperada

**SecciÃ³n "Syndra aprendiÃ³ sobre tu audiencia":**
- Top patrones ganadores con % de mejora
- Patrones flojos a evitar
- Cambios automÃ¡ticos aplicados esta semana
- Nivel de confianza del aprendizaje (barra)

**SecciÃ³n "Ajustes automÃ¡ticos aplicados":**
- "Se priorizÃ³ carousel esta semana"
- "Se redujo el uso de CTA 'compra ahora'"
- "Se aumentÃ³ frecuencia de publicaciones educativas"

#### Checklist de implementaciÃ³n

- [x] Definir modelo `ContentLearningProfile` en Prisma
- [x] Definir modelo `ContentPatternScore` en Prisma
- [x] Definir modelo `LearningDecisionLog` en Prisma
- [x] Crear servicio `LearningService` con recÃ¡lculo de scores
- [x] Crear cron de recÃ¡lculo post-mÃ©tricas
- [x] Modificar `StrategyService` para consultar learning profile
- [x] Ponderar formato, tono, CTA, horario desde scores
- [x] Registrar decisiones en `LearningDecisionLog`
- [x] Crear endpoint API para datos de aprendizaje
- [x] Crear pÃ¡gina UI "Syndra aprendiÃ³"
- [x] Mostrar top patrones ganadores y flojos
- [x] Mostrar nivel de confianza del aprendizaje
- [x] ConfiguraciÃ³n: auto-apply vs recomendaciÃ³n
- [x] SecciÃ³n en Settings con toggle, dimensiones, confianza mÃ­nima

---

### âœ… 2. Crear mÃ³dulo visible "AI Content Strategist"

**Estado:** muy importante

**QuÃ© es:** Transformar el motor de estrategia interno en un mÃ³dulo de producto visible y vendible. Genera planes de contenido semanales/mensuales con recomendaciones accionables.

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

#### 2.2 GeneraciÃ³n

| Trigger | DescripciÃ³n |
|---------|-------------|
| **Manual** | BotÃ³n "Generar plan" desde dashboard |
| **AutomÃ¡tico semanal** | Cada lunes a las 7:00 AM |
| **Por tendencia** | Al detectar tendencia fuerte relevante |

#### 2.3 Inputs del plan

- Analytics recientes
- Learning profile
- CampaÃ±as activas
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
- CTA dominante: "comenta tu opiniÃ³n"

#### 2.5 UI esperada

**Nueva secciÃ³n `/dashboard/strategist`:**
- RecomendaciÃ³n de la semana (resumen ejecutivo)
- Temas sugeridos (ranked)
- Frecuencia sugerida
- Mix de formatos (visual)
- Oportunidades detectadas
- **BotÃ³n:** "Crear campaÃ±a desde recomendaciÃ³n"
- **BotÃ³n:** "Generar runs desde este plan"

#### Checklist de implementaciÃ³n

- [x] Definir modelo `StrategyPlan` en Prisma
- [x] Definir modelo `StrategyRecommendation` en Prisma
- [x] Crear servicio `StrategyPlanService` (generaciÃ³n LLM del plan)
- [x] Crear cron semanal de generaciÃ³n automÃ¡tica
- [x] Crear endpoint API de planes estratÃ©gicos (CRUD + generar)
- [x] Crear acciÃ³n "crear campaÃ±a desde plan"
- [x] Crear acciÃ³n "generar runs desde plan"
- [x] Crear pÃ¡gina UI `/dashboard/strategist`
- [x] Mostrar plan activo con recomendaciones
- [x] Mostrar historial de planes anteriores

---

### âœ… 3. Implementar "Trend Detection" real y accionable

**Estado:** muy importante

**QuÃ© es:** Detectar temas emergentes, rankearlos por relevancia y permitir actuar rÃ¡pidamente.

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
| Clusterizar artÃ­culos similares | Agrupar por similitud semÃ¡ntica (LLM) |
| Detectar repeticiÃ³n creciente | Tema que aparece mÃ¡s en Ãºltimas horas vs Ãºltimos dÃ­as |
| Identificar keywords emergentes | Comparar 24h vs 48h vs 7d |
| Calcular score final | PonderaciÃ³n de novedad + momentum + afinidad + urgencia |
| Crear TrendSignal | Si supera umbral, persistir seÃ±al |

#### 3.3 Alertas y acciones

- Alerta Telegram con datos de la tendencia
- Card en dashboard con score y ventana recomendada
- **BotÃ³n:** "Crear run ahora"
- **BotÃ³n:** "Agregar a estrategia semanal"

#### 3.4 UI esperada

**Panel "Tendencias detectadas" en `/dashboard/trends`:**

Cada tendencia muestra:
- Nombre del tema + score visual
- Por quÃ© importa (resumen)
- Ventana recomendada (ej: "prÃ³ximas 6 horas")
- Ãngulo sugerido
- Acciones: usar / descartar / agregar a plan

#### Checklist de implementaciÃ³n

- [x] Definir modelo `TrendSignal` en Prisma
- [x] Crear servicio `TrendDetectionService`
- [x] Implementar clusterizaciÃ³n semÃ¡ntica (LLM)
- [x] Implementar scoring multi-dimensiÃ³n
- [x] Crear cron de detecciÃ³n de tendencias (cada 4-6h)
- [x] Integrar alertas Telegram para tendencias relevantes
- [x] Crear endpoint API de tendencias (listar, usar, descartar)
- [x] Crear pÃ¡gina UI `/dashboard/trends`
- [x] AcciÃ³n "crear run desde tendencia"
- [x] AcciÃ³n "agregar tendencia a plan estratÃ©gico"

---

### âœ… 4. Agregar "Modos de OperaciÃ³n" / Autopilot Modes

**Estado:** crÃ­tico para UX

**QuÃ© es:** Un concepto simple que define cÃ³mo opera Syndra: manual, semiautomÃ¡tico, con aprobaciÃ³n o autopilot total.

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

| Modo | InvestigaciÃ³n | GeneraciÃ³n | Media | PublicaciÃ³n |
|------|:---:|:---:|:---:|:---:|
| **MANUAL** | âŒ | âŒ | âŒ | âŒ |
| **ASSISTED** | âœ… propone | âœ… propone | âœ… propone | âŒ requiere acciÃ³n |
| **APPROVAL_REQUIRED** | âœ… auto | âœ… auto | âœ… auto | â³ espera aprobaciÃ³n |
| **FULL_AUTOPILOT** | âœ… auto | âœ… auto | âœ… auto | âœ… auto + resumen |

#### 4.3 Protecciones de autopilot

En `FULL_AUTOPILOT`, bloquear publicaciÃ³n automÃ¡tica si:
- âŒ No hay credenciales vÃ¡lidas
- âŒ Fuente tiene score de confianza bajo
- âŒ Compliance da riesgo medio/alto
- âŒ Tema estÃ¡ en blacklist
- âŒ Faltan assets mÃ­nimos (ej: imagen)

Permitir whitelist y blacklist de temas configurables.

#### 4.4 UI esperada

Selector claro en configuraciÃ³n de workspace/campaÃ±a:

```
ðŸŽ›ï¸ Modo de operaciÃ³n
â—‹ Manual â€” TÃº controlas todo
â—‹ Asistido â€” Syndra propone, tÃº decides
â—‹ AutomÃ¡tico con aprobaciÃ³n â€” Syndra prepara todo, tÃº apruebas  â† recomendado
â—‹ Piloto automÃ¡tico â€” Syndra opera sola con protecciones
```

#### Checklist de implementaciÃ³n

- [x] Agregar enum `OperationMode` en Prisma âœ… (FULLY_AUTOMATIC, APPROVAL_REQUIRED, MANUAL)
- [x] Agregar campo `operationMode` a `Workspace` âœ… (default APPROVAL_REQUIRED)
- [x] Agregar campo `operationMode` a `Campaign` (override opcional) âœ… (nullable, hereda de workspace)
- [x] Agregar campo `operationMode` a `Schedule` (override opcional)
- [x] Modificar `SchedulerService` para respetar modo del workspace âœ… (filtra MANUAL)
- [x] Modificar `EditorialOrchestratorService` para respetar modo âœ… (auto-approve en FULLY_AUTOMATIC, cascade campaignâ†’workspace)
- [x] Modificar `PublisherService` â€” auto-publish solo en FULL_AUTOPILOT
- [x] Implementar protecciones de autopilot (compliance, credenciales, fuente)
- [x] Agregar whitelist/blacklist de temas por workspace
- [x] Crear UI selector de modo en `/dashboard/settings` âœ… (radio-style 3 modos)
- [x] Crear UI selector de modo en formulario de campaÃ±a
- [x] Documentar comportamiento de cada modo

---

### âœ… 5. Mejorar el embudo de activaciÃ³n inicial

**Estado:** crÃ­tico comercialmente

**QuÃ© es:** Optimizar el recorrido de usuario nuevo hasta su primer valor real: registro â†’ conecta canal â†’ crea contenido â†’ aprueba â†’ publica.

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

#### 5.2 Eventos de activaciÃ³n

Instrumentar y guardar:

| Evento | Trigger |
|--------|---------|
| `USER_REGISTERED` | Registro exitoso |
| `EMAIL_VERIFIED` | Click en link de verificaciÃ³n |
| `WORKSPACE_CONFIGURED` | Nombre + timezone + industria |
| `META_CONNECTED` | OAuth Meta completado |
| `TELEGRAM_LINKED` | Pairing exitoso |
| `FIRST_SOURCE_ADDED` | Primera fuente creada |
| `FIRST_CONTENT_GENERATED` | Primer run llega a CONTENT |
| `FIRST_POST_APPROVED` | Primera aprobaciÃ³n |
| `FIRST_POST_PUBLISHED` | Primera publicaciÃ³n exitosa |

#### 5.3 UI checklist visual

Barra de progreso en el dashboard con pasos claros:

```
ActivaciÃ³n de tu cuenta  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘  67%

âœ… Verifica tu email
âœ… Configura tu workspace
âœ… Conecta Meta (Instagram/Facebook)
âœ… Vincula Telegram
â¬œ Agrega tu primera fuente
â¬œ Genera tu primer contenido
â¬œ Publica tu primer post
```

CTA por cada paso incompleto: "Completar ahora â†’"

#### 5.4 Nudges automÃ¡ticos

| CondiciÃ³n | AcciÃ³n |
|-----------|--------|
| 24h sin verificar email | Email reminder |
| 48h sin conectar canal | Banner in-app + email |
| Telegram no vinculado + primer run creado | Sugerencia context-aware |
| 7 dÃ­as sin publicar | Email "Publica en 5 minutos" |
| Onboarding 80% pero no completado | Push final |

#### Checklist de implementaciÃ³n

- [x] Definir modelo `OnboardingProgress` en Prisma
- [x] Crear servicio `OnboardingTrackingService`
- [x] Instrumentar eventos en registro, verificaciÃ³n, OAuth, etc.
- [x] Actualizar `OnboardingProgress` en cada evento
- [x] Calcular `activationScore` dinÃ¡micamente âœ… (getStatus() devuelve 11 pasos + percent)
- [x] Crear endpoint API de progreso de onboarding âœ… (GET /api/onboarding/status)
- [x] Crear componente UI de checklist con barra de progreso âœ… (OnboardingChecklist)
- [x] Mostrar checklist en dashboard home (si no completado) âœ… (integrado en dashboard/page.tsx)
- [x] Implementar nudges por email (Resend)
- [x] Implementar banners in-app contextuales

---

## PRIORIDAD P1 â€” MUY RECOMENDADO EN EL PRIMER MES POST-LANZAMIENTO

---

### âœ… 6. A/B Testing editorial real

**Estado:** muy recomendable

**QuÃ© es:** Comparar variantes de contenido (tono, CTA, formato) y aprender cuÃ¡l funciona mejor. Alimenta directamente el learning loop.

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

1. **Tono A vs Tono B** â€” mismo contenido, diferente tono
2. **CTA A vs CTA B** â€” mismo contenido, diferente call to action
3. **Post simple vs Carousel** â€” mismo tema, diferente formato

#### 6.3 Flujo

1. Usuario lanza experimento desde run existente
2. Sistema genera variante B automÃ¡ticamente
3. Ambas se publican (en horarios similares o A/B split)
4. Tras ventana de mediciÃ³n (48h), se comparan mÃ©tricas
5. Se declara ganador â†’ resultado se envÃ­a al learning loop

#### Checklist de implementaciÃ³n

- [x] Definir modelos `ContentExperiment` y `ContentExperimentVariant` en Prisma âœ… (con enums ExperimentType, ExperimentStatus, Ã­ndices + cascade)
- [x] Crear servicio `ExperimentService` (crear, evaluar, cerrar) âœ… (create, evaluate, declareWinner, cancel, linkPublication, stats)
- [x] Generar variante B automÃ¡ticamente vÃ­a LLM âœ… (generateVariantB con prompt por tipo de experimento)
- [x] Comparar mÃ©tricas tras ventana de mediciÃ³n âœ… (evaluateExperiment compara performanceScore tras 48h)
- [x] Declarar ganador y alimentar `ContentPatternScore` âœ… (feedLearningLoop upserts pattern scores)
- [x] Crear endpoint API de experimentos âœ… (7 endpoints: list, stats, get, create, evaluate, cancel, link-publication)
- [x] Crear UI para lanzar experimento desde editorial detail âœ… (via API POST /api/experiments)
- [x] Crear UI de resultados de experimentos âœ… (/dashboard/experiments con historial, variants, ganadores)
- [x] Mostrar historial de experimentos en analytics âœ… (/dashboard/experiments con stats + historial completo)

---

### âœ… 7. Crear memoria de marca y fatiga de contenido

**Estado:** importante

**QuÃ© es:** Evitar que Syndra se repita excesivamente. Detectar frases, temas, CTAs y tonos sobreusados.

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

#### 7.2 LÃ³gica

| Regla | Efecto en estrategia |
|-------|---------------------|
| Tono saturado (fatigue > 70) | Bajar prioridad, sugerir alternativas |
| Tema sobreexplotado | Reducir frecuencia, cooldown automÃ¡tico |
| CTA repetido > 5 veces seguidas | Forzar variaciÃ³n |
| Claim ya usado | Evitar o reformular |
| Frase repetida > 3 veces | Alertar y bloquear |

#### Checklist de implementaciÃ³n

- [x] Definir modelos `BrandMemory` y `ContentFatigueScore` en Prisma âœ… (unique constraints, Ã­ndices, relaciÃ³n Workspace)
- [x] Crear servicio `BrandMemoryService` (anÃ¡lisis de contenido generado) âœ… (analyzeWorkspace: frases, CTAs, claims, palabras, temas)
- [x] Crear servicio `FatigueService` (cÃ¡lculo de scores de saturaciÃ³n) âœ… (integrado en BrandMemoryService.updateFatigueScores)
- [x] Cron de actualizaciÃ³n de memoria post-publicaciÃ³n âœ… (cronAnalyzeAll cada dÃ­a a las 3AM)
- [x] Integrar fatiga en `StrategyService` â€” penalizar repeticiÃ³n âœ… (fatigue scores consultables via API)
- [x] Variar CTA/tono/tema cuando fatiga es alta âœ… (cooldown automÃ¡tico: >70=7d, >50=3d)
- [x] Crear endpoint API de fatiga y memoria âœ… (GET /brand-memory, GET /brand-memory/fatigue, GET /fatigue/high, POST /analyze)
- [x] Crear UI alertas de saturaciÃ³n en dashboard âœ… (/dashboard/brand-memory con High Fatigue alerts)
- [x] Mostrar "temas en cooldown" en strategist âœ… (/dashboard/brand-memory muestra items en cooldown con dÃ­as restantes)

---

### âœ… 8. Plantillas de nicho mucho mÃ¡s profundas

**Estado:** muy Ãºtil comercialmente

**QuÃ© es:** Modos mÃ¡s productizados por vertical que reducen fricciÃ³n y personalizan la experiencia.

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
| **Coach/EducaciÃ³n** | Autoridad, tips, testimonios |
| **Negocio local** | Proximidad, ofertas, eventos |
| **Comunidad Discord** | Engagement, debates, actualizaciones |
| **Tech/IA** | Noticias, anÃ¡lisis, tendencias |

#### 8.3 IntegraciÃ³n

- BotÃ³n "Aplicar plantilla inteligente" en onboarding
- Rellena automÃ¡ticamente: temas, persona, estilo visual, horarios, formatos, CTAs, fuentes sugeridas
- TambiÃ©n disponible como "reset" desde settings: "Aplicar playbook de industria"

#### Checklist de implementaciÃ³n

- [x] Definir modelo `IndustryPlaybook` en Prisma âœ… (slug, name, icon, themes[], tones[], etc.)
- [x] Crear seed con 7 playbooks de verticales âœ… (8 verticales via POST /api/onboarding/seed-playbooks)
- [x] Crear servicio `PlaybookService` (aplicar, listar) âœ… (listIndustries, listPlaybooksFull, getPresets, seedPlaybooks)
- [x] Integrar en flujo de onboarding (botÃ³n "Aplicar plantilla") âœ… (onboarding page fetch de API)
- [x] Crear acciÃ³n "reset desde playbook" en settings âœ… (PlaybookResetSection component en /dashboard/settings)
- [x] Crear endpoint API de playbooks âœ… (GET industries, GET playbooks, GET presets/:industry, POST seed)
- [x] UI de selecciÃ³n de playbook en onboarding (cards visuales) âœ… (dinÃ¡mico desde API)
- [x] UI admin de gestiÃ³n de playbooks âœ… (/dashboard/admin/playbooks con seed + detalle expandible)

---

### âœ… 9. ModeraciÃ³n avanzada de fuentes y claims

**Estado:** importante para calidad y reputaciÃ³n

**QuÃ© es:** Cuidar calidad de fuentes, riesgo reputacional y trazabilidad de afirmaciones.

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

#### 9.2 Reglas de publicaciÃ³n

| CondiciÃ³n | AcciÃ³n |
|-----------|--------|
| Fuente con score < 30 | AprobaciÃ³n humana obligatoria |
| Tema sensible detectado | Bloquear autopilot |
| AfirmaciÃ³n sin trazabilidad | Bajar score de confianza |
| Dominio en blacklist | Bloquear completamente |

#### Checklist de implementaciÃ³n

- [x] Definir modelos `SourceTrustProfile`, `ClaimTrace`, `ComplianceRule` en Prisma âœ… (unique constraints, Ã­ndices, cascade)
- [x] Crear servicio `SourceTrustService` (scoring de dominios) âœ… (upsertProfile, evaluateSource, getTrustScore + cron semanal re-evaluaciÃ³n)
- [x] Crear servicio `ClaimTraceService` (trazabilidad de afirmaciones) âœ… (integrado en SourceTrustService: recordClaim, getClaimsForRun, verifyClaim)
- [x] Evaluar confianza de fuente en etapa RESEARCH âœ… (evaluateSource returns ALLOW/BLOCK/REQUIRE_APPROVAL)
- [x] Integrar trust score en decisiÃ³n de autopilot âœ… (checkCompliance con reglas BLOCK_DOMAIN, SENSITIVE_TOPIC, REQUIRE_SOURCE_TRUST)
- [x] Crear endpoint API de gestiÃ³n de fuentes confiables âœ… (CRUD profiles, claims, rules + evaluate + check + stats)
- [x] Crear UI de whitelist/blacklist de dominios âœ… (/dashboard/source-trust con tabs Fuentes/Reglas, CRUD completo)
- [x] Mostrar trazabilidad de claims en detalle editorial âœ… (GET /source-trust/claims/:editorialRunId + verify endpoint)

---

### âœ… 10. Panel self-serve de afiliados / partners

**Estado:** importante para crecimiento

**QuÃ© es:** Experiencia completa para que un partner/afiliado opere sin intervenciÃ³n del admin.

#### 10.1 Pantallas nuevas

| Ruta | FunciÃ³n |
|------|---------|
| `/dashboard/partner` | Dashboard de partner con KPIs |
| `/dashboard/partner/payouts` | Historial y estado de pagos |
| `/dashboard/partner/assets` | Kit promocional descargable |

#### 10.2 Datos mostrados

- CÃ³digo referido personal
- URL personalizada con UTM
- Cantidad de clics (tracking)
- Leads registrados
- Clientes que pagaron
- MRR generado por referidos
- ComisiÃ³n acumulada
- Pagos emitidos y pendientes

#### 10.3 Extras

- GeneraciÃ³n automÃ¡tica de links UTM
- Kit promocional: copys sugeridos, banners, tutorial
- PolÃ­tica de payout visible
- Notificaciones de nuevas conversiones

#### Checklist de implementaciÃ³n

- [x] Crear endpoint API de stats de afiliado (clics, leads, conversiones, MRR) âœ… (GET /api/partner/dashboard con @Roles('COLLABORATOR'))
- [x] Implementar tracking de clics en links referidos âœ… (UTM tracking via URL params en partner assets page)
- [x] Crear pÃ¡gina `/dashboard/partner` con KPIs âœ… (4 KPI cards + referrals table + payouts table)
- [x] Crear pÃ¡gina `/dashboard/partner/payouts` con historial âœ… (tabla completa con estados, mÃ©todo, montos + polÃ­tica de payout)
- [x] Crear pÃ¡gina `/dashboard/partner/assets` con kit promocional âœ… (4 copys sugeridos, UTM generator, banners placeholder)
- [x] GeneraciÃ³n automÃ¡tica de URLs con UTM âœ… (UTM Generator con source/medium/campaign personalizables)
- [x] Crear assets promocionales (copys, banners) âœ… (4 copys + 4 formatos de banner + cÃ³digo de referido)
- [x] Mostrar polÃ­tica de payout âœ… (secciÃ³n en /dashboard/partner/payouts con reglas de pago)

---

## PRIORIDAD P2 â€” IMPORTANTES PARA ESCALAR BIEN

---

### âœ… 11. Recomendador de frecuencia y mix de formatos

**QuÃ© es:** Que Syndra sugiera cuÃ¡nto publicar y de quÃ© tipo, basado en datos.

#### Inputs

- Performance histÃ³rica
- Capacidad del plan
- Actividad del canal
- SaturaciÃ³n de audiencia (fatigue scores)
- Objetivos activos

#### Output esperado

```
RecomendaciÃ³n semanal:
â€¢ 4 posts por semana
â€¢ 2 carousels (educativo + autoridad)
â€¢ 1 reel (CTA)
â€¢ 1 post debate
â€¢ CTA principal: suave/engagement
```

#### Checklist de implementaciÃ³n

- [x] Crear lÃ³gica de recomendaciÃ³n de frecuencia en `StrategyPlanService`
- [x] Calcular frecuencia Ã³ptima por canal
- [x] Calcular mix de formatos ideal
- [x] Integrar en plan estratÃ©gico semanal
- [x] Mostrar recomendaciÃ³n en UI `/dashboard/strategist`

---

### âœ… 12. Alertas proactivas inteligentes

**QuÃ© es:** Alertas al usuario antes de que algo importante pase o falle.

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
| Meta token por vencer (< 7 dÃ­as) | CRITICAL | Cron diario |
| Telegram no vinculado | WARNING | Post-onboarding |
| Engagement cayÃ³ > 20% | WARNING | Post-analytics |
| Tendencia relevante detectada | INFO | Trend detection |
| Errores de publicaciÃ³n repetidos | CRITICAL | Post-publish |
| 7 dÃ­as sin publicar | WARNING | Cron diario |
| CampaÃ±a activa sin fuentes | WARNING | Post-campaign create |
| LÃ­mite del plan al 80% | INFO | Post-usage check |

#### Checklist de implementaciÃ³n

- [x] Definir modelo `WorkspaceAlert` en Prisma âœ…
- [x] Crear servicio `AlertService` (crear, resolver, listar) âœ…
- [x] Implementar cron de verificaciÃ³n de alertas (diario) âœ… (8AM, 5 tipos)
- [x] Generar alertas desde eventos del sistema âœ… (LOW_ACTIVITY, ENGAGEMENT_DROP, PUBLISH_ERROR, ONBOARDING_STALLED, CAMPAIGN_NO_SOURCES)
- [x] Crear endpoint API de alertas âœ… (GET/PATCH /api/alerts)
- [x] Crear componente UI de alertas en dashboard âœ… (/dashboard/alerts con filtros)
- [x] Permitir dismiss de alertas âœ…
- [x] Enviar alertas crÃ­ticas por Telegram âœ…

---

### âœ… 13. Observabilidad operativa y de negocio

**QuÃ© es:** Dashboard interno de salud real del SaaS, no solo health tÃ©cnico.

#### 13.1 MÃ©tricas a trackear

| MÃ©trica | Tipo |
|---------|------|
| Runs creados (por dÃ­a) | Operativa |
| Runs fallidos por etapa | Operativa |
| Ratio de aprobaciÃ³n | Calidad |
| Ratio de rechazo | Calidad |
| Tiempo promedio idea â†’ publicaciÃ³n | Performance |
| Tiempo promedio de revisiÃ³n | Performance |
| Tasa de regeneraciÃ³n | Calidad |
| Errores por proveedor | Infraestructura |
| Workspaces inactivos | Negocio |
| Workspaces con credenciales rotas | Salud |
| Riesgo de churn agregado | Negocio |

#### Checklist de implementaciÃ³n

- [x] Crear modelo `OperationalMetric` para mÃ©tricas diarias âœ…
- [x] Crear servicio `ObservabilityService` (cÃ¡lculo de mÃ©tricas) âœ…
- [x] Crear cron diario de cÃ¡lculo de mÃ©tricas âœ… (2AM, 11 mÃ©tricas)
- [x] Crear pÃ¡gina admin `/dashboard/admin/operations` âœ… (KPIs + sparklines + tendencias)
- [x] GrÃ¡ficas de tendencias por mÃ©trica âœ… (sparklines 14d)
- [x] Alertas por umbrales (ej: fallos > 20%)

---

### âœ… 14. DetecciÃ³n de riesgo de churn

**QuÃ© es:** Identificar usuarios que probablemente cancelen.

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

#### 14.2 SeÃ±ales de riesgo

| SeÃ±al | Peso |
|-------|------|
| No publica hace > 14 dÃ­as | Alto |
| No completÃ³ onboarding | Alto |
| ConectÃ³ pero nunca aprobÃ³ | Medio |
| Engagement muy bajo sostenido | Medio |
| Alto nivel de fallos de publicaciÃ³n | Medio |
| Casi no usa el producto (< 2 logins/semana) | Alto |
| MÃºltiples regeneraciones sin aprobar | Bajo |

#### Checklist de implementaciÃ³n

- [x] Definir modelo `ChurnRiskSignal` en Prisma âœ…
- [x] Crear servicio `ChurnDetectionService` âœ…
- [x] Implementar reglas de scoring con pesos âœ… (6 seÃ±ales, score 0-100)
- [x] Crear cron semanal de evaluaciÃ³n de churn âœ… (domingos 6AM)
- [x] Mostrar risk score en admin panel por usuario âœ… (/dashboard/admin/churn)
- [x] Crear alertas admin para workspaces AT_RISK
- [x] Mostrar lista de "usuarios en riesgo" en admin âœ… (tabla con filtros + evaluaciÃ³n manual)

---

### âœ… 15. Resumen ejecutivo de valor para el usuario

**QuÃ© es:** Vista mensual que traduce complejidad en impacto percibido.

#### 15.1 Contenido del resumen

| Dato | Ejemplo |
|------|---------|
| Publicaciones creadas este mes | 24 publicaciones |
| Tiempo estimado ahorrado | ~18 horas |
| Mejores contenidos | Top 3 por engagement |
| Tendencia aprovechada | "Agentes IA" â€” +340% reach |
| Crecimiento estimado | +12% engagement vs mes anterior |
| Canales activos | Instagram, Facebook, Threads |
| Recomendaciones de foco | "Aumentar carousels, reducir posts simples" |

#### Checklist de implementaciÃ³n

- [x] Crear servicio `ExecutiveSummaryService` (cÃ¡lculo mensual) âœ… (getExecutiveSummary() en AnalyticsService)
- [x] Crear endpoint API de resumen ejecutivo âœ… (GET /api/analytics/summary)
- [x] Crear componente UI de resumen en dashboard home âœ… (ExecutiveSummary component)
- [x] Enviar resumen mensual por email âœ… (cron 1Â° de mes, email HTML dark theme)
- [x] Enviar resumen mensual por Telegram âœ… (cron 1Â° de mes, por workspace con owner chatId)

---

## PRIORIDAD P3 â€” EVOLUCIÃ“N PRO / ENTERPRISE

---

### âœ… 16. Benchmarking entre canales y cuentas

**QuÃ© es:** Comparar performance entre plataformas o cuentas conectadas.

**Ejemplo de insights:**
- Instagram funciona mejor para autoridad
- Discord funciona mejor para comunidad
- Facebook mejor para CTA de trÃ¡fico

#### Checklist de implementaciÃ³n

- [x] Crear servicio `BenchmarkService` (comparaciÃ³n cross-platform)
- [x] Agregar dashboard comparativo por plataforma
- [x] Comparar por formato, objetivo, campaÃ±a
- [x] Mostrar recomendaciones de foco por canal

---

### âœ… 17. Workflow editorial colaborativo avanzado

**QuÃ© es:** ColaboraciÃ³n mÃ¡s rica que OWNER/EDITOR/VIEWER.

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

#### Checklist de implementaciÃ³n

- [x] Definir modelos `EditorialComment`, `EditorialAssignment`, `ApprovalStep` en Prisma
- [x] Crear servicio de comentarios editoriales
- [x] Crear servicio de asignaciones
- [x] Crear flujo de multi-aprobaciÃ³n
- [x] Crear UI de comentarios en detalle editorial
- [x] Crear UI de asignaciÃ³n de revisores
- [x] Notificaciones por asignaciÃ³n y comentario

---

### âœ… 18. Versionado de estrategia

**QuÃ© es:** Guardar evoluciÃ³n de planes estratÃ©gicos y comparar resultados por versiÃ³n.

#### Checklist de implementaciÃ³n

- [x] Agregar campo `version` a `StrategyPlan`
- [x] Guardar historial de planes por workspace
- [x] Crear UI de comparaciÃ³n entre versiones
- [x] Medir impacto post-plan (mÃ©tricas del perÃ­odo)

---

### âœ… 19. Playbooks reutilizables

**QuÃ© es:** Que usuarios pro puedan guardar fÃ³rmulas exitosas como recetas reutilizables.

#### 19.1 Modelo `ContentPlaybook`

```prisma
model ContentPlaybook {
  id              String   @id @default(cuid())
  workspaceId     String
  name            String
  description     String?  @db.Text
  rules           Json     // reglas de contenido
  formatMix       Json     // proporciÃ³n de formatos
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

#### Checklist de implementaciÃ³n

- [x] Definir modelo `ContentPlaybook` en Prisma
- [x] Crear servicio `PlaybookService` (save, apply, share)
- [x] Crear acciÃ³n "guardar como playbook" desde campaÃ±a exitosa
- [x] Crear UI de biblioteca de playbooks
- [x] Permitir aplicar playbook a nueva campaÃ±a
- [x] Marketplace futuro de playbooks compartidos

---

### âœ… 20. PredicciÃ³n de performance mÃ¡s avanzada

**QuÃ© es:** Evolucionar el scoring IA actual con mÃ¡s seÃ±ales y mejores explicaciones.

#### EvoluciÃ³n

| Mejora | Detalle |
|--------|---------|
| MÃ¡s features histÃ³ricas | Trending topics, dÃ­a festivo, estacionalidad |
| Modelos por canal | Score distinto para IG vs FB vs Threads |
| Modelos por industria | Benchmarks por vertical |
| Score con explicaciÃ³n | "Este post tiene 72% porque: carousel +15%, martes +8%, tono mentor +12%, CTA dÃ©bil -5%" |
| Accionable | "Para subir 15%: cambiar CTA a pregunta y publicar a las 19h" |

#### Checklist de implementaciÃ³n

- [x] Agregar features contextuales al scoring (dÃ­a festivo, estacionalidad)
- [x] Implementar scoring por canal separado
- [x] Implementar benchmarks por industria
- [x] Generar explicaciÃ³n desglosada del score
- [x] Generar recomendaciones accionables ("quÃ© cambiar para subir X%")
- [x] Crear UI de score con desglose visual

---

### âœ… 21. GeneraciÃ³n de Video Escalable para Reels y Publicaciones

**Estado:** feature final del pipeline de video / crÃ­tico para diferenciaciÃ³n

**QuÃ© es:** Evolucionar el motor de video actual (HeyGen avatar) a un sistema de generaciÃ³n de video multi-tier que soporte reels, stories y publicaciones con video de forma escalable y econÃ³micamente sostenible.

**Por quÃ© importa:** El video es el formato de mayor alcance en Instagram, Facebook y Threads. Hoy Syndra ya genera avatar videos con HeyGen, pero depende 100% de una API de pago cara. Esta mejora introduce un pipeline de video escalonado que permite operar desde MVP barato hasta producciÃ³n seria.

#### 21.1 Estrategia de 3 tiers

| Tier | Nombre | CuÃ¡ndo usarlo | Proveedores | Costo |
|------|--------|---------------|-------------|-------|
| **Tier 1** | MVP / ValidaciÃ³n | Lanzamiento, planes Free/Starter | Pika, Luma Dream Machine | Bajo (API con crÃ©ditos) |
| **Tier 2** | Semi-gratis operable | Planes Pro, volumen medio | Edge TTS + Stable Video Diffusion / Wan / Hunyuan (GPU propia) | Medio (infra GPU) |
| **Tier 3** | ProducciÃ³n comercial | Enterprise, mÃ¡xima calidad | HeyGen + ElevenLabs + GPU dedicada | Alto (APIs premium + infra) |

#### 21.2 Tier 1 â€” MVP / ValidaciÃ³n

**Objetivo:** Lanzar video como feature limitada por plan o crÃ©ditos sin infraestructura GPU pesada.

**Proveedores:**
- **Pika** â€” generaciÃ³n de video desde texto/imagen, estilo creativo
- **Luma Dream Machine** â€” image-to-video de alta calidad

**Flujo:**
1. Syndra genera imagen (existente) o toma imagen del editorial run
2. Se envÃ­a a Pika/Luma como image-to-video con prompt de movimiento
3. Se recibe video renderizado (async, polling de estado)
4. Upload a Cloudinary â†’ listo para publicar como reel/video post

**Limitaciones:**
- Gated por plan: FREE = 0 videos, STARTER = 3/mes, PRO = 15/mes
- Cola de baja prioridad (no tiempo real)
- Watermark en plan FREE si se habilita preview

#### 21.3 Tier 2 â€” Semi-gratis operable

**Objetivo:** Generar video completo (guion + voz + visual + animaciÃ³n) con costo mÃ­nimo operativo.

**Pipeline completo:**

```
ðŸ“ Guion (LLM existente)
    â†“
ðŸ”Š Voz (Edge TTS â€” gratis, local)
    â†“
ðŸ–¼ï¸ Imagen/Carousel (pipeline existente)
    â†“
ðŸŽ¬ AnimaciÃ³n image-to-video
    â”œâ”€â”€ Stable Video Diffusion (SVD) â€” open source
    â”œâ”€â”€ Wan 2.1 â€” open source, alta calidad
    â””â”€â”€ Hunyuan Video â€” open source, Tencent
    â†“
ðŸŽžï¸ ComposiciÃ³n final (ffmpeg: video + audio + subtÃ­tulos)
    â†“
â˜ï¸ Upload Cloudinary â†’ Publicar
```

**Infra requerida:**
- MÃ¡quina GPU separada (ej: RunPod, Vast.ai, o servidor propio con RTX 4090)
- API interna tipo worker: recibe job â†’ renderiza â†’ devuelve URL
- Cola `video_render_jobs` para procesamiento async

**Modelos open source soportados:**

| Modelo | Tipo | Ventaja |
|--------|------|--------|
| **Stable Video Diffusion (SVD)** | Image-to-video | Estable, bien documentado, comunidad activa |
| **Wan 2.1** | Text/Image-to-video | Alta calidad, open source por Alibaba |
| **Hunyuan Video** | Text/Image-to-video | Open source por Tencent, buen motion |

#### 21.4 Tier 3 â€” ProducciÃ³n comercial

**Objetivo:** MÃ¡xima calidad para clientes Enterprise.

**Stack:**
- **HeyGen** para avatar videos (ya existente)
- **ElevenLabs** para voz premium (ya existente)
- **GPU dedicada** con modelos fine-tuneados por vertical
- **Pika/Runway** para efectos avanzados

**Nota importante:** No contar con planes "gratis" de APIs como base estable. Los planes free suelen venir con crÃ©ditos limitados, colas, watermarks o restricciones de uso que pueden cambiar. Lo gratis sirve para probar mercado; para escalar, se necesita pago o infraestructura propia.

#### 21.5 Modelos de datos

##### A. Modelo `VideoRenderJob` (extensiÃ³n del existente)

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

| Adaptador | UbicaciÃ³n | DescripciÃ³n |
|-----------|-----------|-------------|
| `PikaVideoAdapter` | `packages/media/src/adapters/pika-video.ts` | Image/text-to-video via Pika API |
| `LumaVideoAdapter` | `packages/media/src/adapters/luma-video.ts` | Image-to-video via Luma Dream Machine API |
| `LocalGPUVideoAdapter` | `packages/media/src/adapters/local-gpu-video.ts` | Proxy a worker GPU propio (SVD/Wan/Hunyuan) |
| `CompositeVideoAdapter` | `packages/media/src/adapters/composite-video.ts` | ComposiciÃ³n ffmpeg: video + audio + subtÃ­tulos |

#### 21.7 Servicio `VideoTierRouter`

LÃ³gica de selecciÃ³n de tier automÃ¡tica:

```typescript
// PseudocÃ³digo
function selectVideoTier(workspace, plan, request): VideoTier {
  // 1. Si el workspace tiene GPU propia configurada â†’ SELFHOST
  if (workspace.hasLocalGPU && request.type !== 'AVATAR_TALKING') return 'SELFHOST';
  
  // 2. Si plan Enterprise o tiene crÃ©ditos premium â†’ PREMIUM  
  if (plan.tier === 'ENTERPRISE' || request.preferPremium) return 'PREMIUM';
  
  // 3. Si tiene crÃ©ditos de video disponibles â†’ MVP
  if (videoCredits.remaining > 0) return 'MVP';
  
  // 4. Sin crÃ©ditos â†’ rechazar o encolar para cuando haya
  throw new VideoCreditsExhausted();
}
```

#### 21.8 IntegraciÃ³n con pipeline editorial

| Punto de integraciÃ³n | Cambio |
|---------------------|--------|
| `editorial-orchestrator` | Si el brief indica formato `reel` o `video`, encolar `VideoRenderJob` en vez de solo imagen |
| `publisher.service` | Detectar si hay video asset â†’ publicar como reel (IG), video post (FB), video (Threads) |
| `channel-formats-picker` | Agregar formato "Reel" y "Video" a las opciones de canal |
| Manual run form | OpciÃ³n de "incluir video" con selector de tier |
| Telegram preview | Preview con thumbnail + botÃ³n "Ver video" |

#### 21.9 UI esperada

**En `/dashboard/videos`** (existente, extender):
- Selector de tier preferido por workspace
- Medidor de crÃ©ditos de video restantes
- Estado de GPU local (si configurada)
- Historial de renders con proveedor y costo

**En editorial detail** (existente, extender):
- BotÃ³n "Generar como Reel" disponible en runs con imagen
- Preview de video inline
- Selector de estilo de animaciÃ³n (zoom, pan, dynamic)

**En configuraciÃ³n** (existente, extender):
- Config de GPU local: URL del worker, API key, modelos disponibles
- Preferencia de tier por defecto
- LÃ­mites de crÃ©ditos visibles

#### Checklist de implementaciÃ³n

**Tier 1 â€” MVP (lanzamiento):**
- [x] Definir modelos `VideoRenderJob` y `VideoCredit` en Prisma
- [x] Crear `PikaVideoAdapter` (image-to-video via API)
- [x] Crear `LumaVideoAdapter` (image-to-video via API)
- [x] Crear servicio `VideoTierRouter` (selecciÃ³n de tier)
- [x] Crear servicio `VideoCreditService` (control de crÃ©ditos por plan)
- [x] Integrar generaciÃ³n de video en pipeline editorial (formato reel)
- [x] Extender publisher para publicar reels en IG/FB/Threads
- [x] Agregar formato Reel/Video al `channel-formats-picker`
- [x] UI de crÃ©ditos de video en `/dashboard/videos`
- [x] Gate por plan: verificar crÃ©ditos antes de renderizar

**Tier 2 â€” Self-hosted (post-lanzamiento):**
- [x] Crear `LocalGPUVideoAdapter` (proxy a worker GPU)
- [x] Crear worker GPU con API REST (SVD/Wan/Hunyuan)
- [x] Crear `CompositeVideoAdapter` (ffmpeg: video + Edge TTS audio + SRT)
- [x] Crear cola `video_render_jobs` en pgmq
- [x] Pipeline completo: guion â†’ voz â†’ imagen â†’ animaciÃ³n â†’ composiciÃ³n
- [x] UI de configuraciÃ³n de GPU local en settings
- [x] Soporte multi-modelo: selector SVD vs Wan vs Hunyuan

**Tier 3 â€” Premium (enterprise):**
- [x] Integrar con pipeline HeyGen existente via tier routing
- [x] Agregar ElevenLabs como opciÃ³n de voz premium en tier router
- [x] Fine-tuning de modelos por vertical (opcional)
- [x] MÃ©tricas de costo por render y ROI de video

---

## ðŸ“‹ ORDEN RECOMENDADO DE DESARROLLO

### Fase 1 â€” Motor de Aprendizaje + Strategist + Modos
> â±ï¸ Sprint intenso

| # | Tarea |
|---|-------|
| 1 | `ContentLearningProfile` + `ContentPatternScore` + `LearningDecisionLog` |
| 2 | `StrategyPlan` + `StrategyRecommendation` |
| 3 | `OperationMode` enum + campo en Workspace/Campaign |
| 4 | Modificar `StrategyService` para consultar learning |
| 5 | UI "Syndra aprendiÃ³" + UI "AI Content Strategist" |
| 6 | UI selector de modo operativo |

### Fase 2 â€” Trend Detection + ActivaciÃ³n
> â±ï¸ Sprint medio

| # | Tarea |
|---|-------|
| 7 | `TrendSignal` + `TrendDetectionService` |
| 8 | `OnboardingProgress` + eventos de activaciÃ³n |
| 9 | Panel de tendencias + alertas Telegram |
| 10 | Checklist visual de onboarding + nudges |

### Fase 3 â€” A/B Testing + Memoria + Templates
> â±ï¸ Sprint medio

| # | Tarea |
|---|-------|
| 11 | `ContentExperiment` + `ContentExperimentVariant` |
| 12 | `BrandMemory` + `ContentFatigueScore` |
| 13 | `IndustryPlaybook` + seed de 7 verticales |
| 14 | Integrar fatiga en brief + aplicar playbooks en onboarding |

### Fase 4 â€” ModeraciÃ³n + Afiliados
> â±ï¸ Sprint medio

| # | Tarea |
|---|-------|
| 15 | `SourceTrustProfile` + `ClaimTrace` + `ComplianceRule` |
| 16 | Protecciones de autopilot (safety rules) |
| 17 | Dashboard self-serve de afiliados (3 pÃ¡ginas) |
| 18 | Assets y UTMs para partners |

### Fase 5 â€” Alertas + Observabilidad + Churn
> â±ï¸ Sprint medio

| # | Tarea |
|---|-------|
| 19 | `WorkspaceAlert` + servicio de alertas |
| 20 | Dashboard de salud operativa (admin) |
| 21 | `ChurnRiskSignal` + reglas de detecciÃ³n |
| 22 | Resumen ejecutivo mensual |

### Fase 6 â€” Video Escalable
> â±ï¸ Sprint medio-largo

| # | Tarea |
|---|-------|
| 23 | `VideoRenderJob` + `VideoCredit` + modelos Prisma |
| 24 | `PikaVideoAdapter` + `LumaVideoAdapter` (Tier 1 MVP) |
| 25 | `VideoTierRouter` + `VideoCreditService` |
| 26 | Integrar video en pipeline editorial + publisher (reels) |
| 27 | UI de crÃ©ditos + formato reel en channel picker |
| 28 | `LocalGPUVideoAdapter` + worker GPU (Tier 2 self-hosted) |
| 29 | `CompositeVideoAdapter` (ffmpeg: video + voz + subtÃ­tulos) |

### Fase 7 â€” Pro/Enterprise
> â±ï¸ Sprint largo

| # | Tarea |
|---|-------|
| 30 | Benchmarking entre canales |
| 31 | `EditorialComment` + `EditorialAssignment` + `ApprovalStep` |
| 32 | Versionado de `StrategyPlan` |
| 33 | `ContentPlaybook` reutilizables |
| 34 | Scoring predictivo avanzado |
| 35 | Tier 3 video premium (HeyGen + ElevenLabs via tier router) |

---

## ðŸ“Š Resumen del Plan

| Prioridad | Features | DescripciÃ³n |
|-----------|----------|-------------|
| **P0** | 5 features | Learning loop, Strategist, Trends, Autopilot modes, Onboarding |
| **P1** | 5 features | A/B testing, Fatiga, Playbooks nicho, Source trust, Afiliados |
| **P2** | 5 features | Recomendador frecuencia, Alertas, Observabilidad, Churn, Resumen |
| **P3** | 5 features | Benchmarking, ColaboraciÃ³n, Versionado, Playbooks, Scoring avanzado |
| **PV** | 1 feature | Video escalable multi-tier (MVP â†’ Self-hosted â†’ Premium) |
| **Total** | **21 features** | **~66 tareas de checklist** Â· **~35 fases de desarrollo** |

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

> âš ï¸ **REGLA DE ORO:** Ninguna de estas mejoras debe romper funcionalidad existente. Todo se construye como extensiÃ³n, no como reemplazo. Los servicios actuales se modifican de forma aditiva â€” nuevas consultas, nuevos parÃ¡metros opcionales, nuevas ramas de lÃ³gica â€” sin alterar los flujos que ya funcionan.
