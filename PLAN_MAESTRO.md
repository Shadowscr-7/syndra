# Plan Maestro — Plataforma de Automatización de Contenido para Instagram/Facebook

> Arquitectura moderna, pipeline editorial asistido por IA y circuito de aprobación humana vía Telegram

---

## Resumen ejecutivo

**Objetivo:** construir una plataforma SaaS propia que genere, adapte, revise y publique contenido diario en Instagram y Facebook, con foco en IA y captación de audiencia para productos digitales.

**Idea central:** separar creación, revisión y publicación. La IA produce borradores; tú apruebas o corriges desde Telegram; el sistema solo publica cuando recibe tu confirmación.

**Arquitectura recomendada:**

- **Next.js** para panel y APIs públicas.
- **NestJS** para orquestación y workers.
- **Supabase** para datos / auth / storage / colas.
- **Prisma** como ORM estratégico.
- **Vercel** para frontend + endpoints ligeros.
- Motor de media/video desacoplado para piezas más pesadas.

---

## Tabla de contenidos

1. [Visión del producto](#1-visión-del-producto)
2. [Principios de diseño del sistema](#2-principios-de-diseño-del-sistema)
3. [Stack tecnológico recomendado](#3-stack-tecnológico-recomendado)
4. [Arquitectura funcional propuesta](#4-arquitectura-funcional-propuesta)
5. [Flujo diario ideal](#5-flujo-diario-ideal)
6. [Circuito de aprobación en Telegram](#6-circuito-de-aprobación-en-telegram)
7. [Modelo de datos base](#7-modelo-de-datos-base)
8. [Motor de research y actualidad](#8-motor-de-research-y-actualidad)
9. [Sistema de tono, temática y objetivos](#9-sistema-de-tono-temática-y-objetivos)
10. [Generación de imágenes y carruseles](#10-generación-de-imágenes-y-carruseles)
11. [Videos y avatar hablado](#11-videos-y-avatar-hablado)
12. [Publicación a Instagram y Facebook](#12-publicación-a-instagram-y-facebook)
13. [Observabilidad y seguridad](#13-observabilidad-y-seguridad)
14. [Roadmap por fases](#14-roadmap-por-fases)
15. [MVP recomendado para lanzar rápido](#15-mvp-recomendado-para-lanzar-rápido)
16. [Backlog premium / alto impacto](#16-backlog-premium--alto-impacto)
17. [Riesgos reales y cómo mitigarlos](#17-riesgos-reales-y-cómo-mitigarlos)
18. [Recomendación final de implementación](#18-recomendación-final-de-implementación)
19. [Arquitectura de carpetas sugerida](#19-arquitectura-de-carpetas-sugerida)
20. [Fuentes técnicas clave revisadas](#20-fuentes-técnicas-clave-revisadas)

---

## 1. Visión del producto

La plataforma **no debe verse como un "bot que publica"**, sino como un **sistema editorial automatizado con control humano**.

Cada día:

1. Analiza una temática.
2. Detecta oportunidades narrativas.
3. Genera uno o más assets (copy, imagen, carrusel o video corto).
4. Te envía una propuesta lista para aprobar.

Si pides cambios, el sistema **conserva contexto**, aplica la modificación solicitada y vuelve a pedir confirmación antes de publicar.

### Posicionamiento natural

> **"IA aplicada con criterio de negocio"**

Esto significa combinar:

- Noticias del día.
- Educación práctica.
- Autoridad técnica.
- Prueba de herramientas.
- Invitaciones a tus canales.
- Llamados a la acción hacia cursos, consultorías, comunidad o ebooks.

---

## 2. Principios de diseño del sistema

| # | Principio | Descripción |
|---|-----------|-------------|
| 1 | **Human-in-the-loop obligatorio** | Ninguna pieza sale sin aprobación explícita. |
| 2 | **Arquitectura por etapas** | Investigación → estrategia → generación → validación → aprobación → publicación → analítica. |
| 3 | **Desacople contenido/canal** | Una misma idea puede derivar en post, carrusel, reel, historia o video hablado. |
| 4 | **Persistencia total** | Guardar prompts, assets, versiones, feedback, aprobación y performance para reentrenar decisiones futuras. |
| 5 | **Multi-tenant desde el día 1** | Aunque al inicio solo lo uses tú, la estructura debe contemplar múltiples tenants. |
| 6 | **Seguridad y cumplimiento** | Tokens cifrados, permisos mínimos, auditoría de publicación y respeto por límites de APIs externas. |

---

## 3. Stack tecnológico recomendado

| Capa | Tecnología | Rol recomendado | Motivo estratégico |
|------|------------|-----------------|---------------------|
| **Frontend / Admin** | Next.js | Panel editorial, login, dashboard, vista previa y revisión | Excelente DX, integración nativa con Vercel y buen patrón para apps SaaS. |
| **Backend core** | NestJS | Orquestación, colas, integraciones, lógica de negocio | Modular, tipado fuerte, testing robusto y muy bueno para flujos complejos. |
| **ORM** | Prisma | Modelo de datos, migraciones y acceso transaccional | Productividad alta para dominio de negocio y evolución controlada del esquema. |
| **Base + Auth + Storage** | Supabase | Postgres, autenticación, storage, RLS y apoyo operacional | Centraliza piezas críticas sin sacrificar control sobre Postgres. |
| **Deploy web** | Vercel | Hosting del panel, APIs livianas y cron dispatcher | Muy buen fit para Next.js y despliegues rápidos. |
| **Colas** | Supabase Queues / pgmq | Tareas diferidas, reintentos y pipeline asíncrono | Permite desacoplar generación, render y publicación. |
| **Media** | Supabase Storage + Cloudinary | Assets, optimización y delivery de imágenes/videos | Cloudinary aporta pipeline fuerte de media; Supabase sirve como almacenamiento base. |
| **IA texto** | LLM vía API | Research, copy, adaptación de tono, respuesta a correcciones | Debes abstraer el proveedor para no quedar atado. |
| **IA imagen** | Generador de imágenes por API | Posts visuales, fondos, variaciones y piezas sociales | Conviene encapsularlo detrás de un servicio de prompt/render. |
| **Avatar video** | HeyGen API u otro proveedor similar | Videos hablados con avatar y voz | Acelera producción de clips cortos sin montar un estudio propio. |
| **Notificaciones** | Telegram Bot API | Aprobación humana, feedback y comandos rápidos | Canal rápido, barato y excelente para revisión operativa. |

### Decisión de arquitectura

> Usa **Next.js** para experiencia de producto y **NestJS** para el "cerebro operacional".
>
> No mezcles toda la lógica compleja en Route Handlers de Next. El panel y el motor editorial deben escalar por separado.
>
> Vercel sirve muy bien como cara pública y disparador programado; la ejecución pesada conviene descargarla a workers propios o funciones desacopladas.

---

## 4. Arquitectura funcional propuesta

La arquitectura recomendada es **orientada a eventos**. Un scheduler dispara una corrida editorial. Esa corrida crea un job maestro que atraviesa subetapas con persistencia entre cada paso. El resultado **nunca se publica directamente**: primero entra al circuito de aprobación por Telegram.

| Módulo | Qué hace | Entradas | Salidas |
|--------|----------|----------|---------|
| **Scheduler** | Dispara campañas diarias o temáticas especiales | Calendario, reglas, prioridades | Job editorial |
| **Research Engine** | Obtiene señales de actualidad y contexto | Temas, fuentes, keywords | Resumen de tendencias y noticias |
| **Strategy Engine** | Define ángulo, formato, CTA y objetivo | Perfil de marca + research | Brief creativo |
| **Content Engine** | Genera copies, hooks, slides, captions y títulos | Brief creativo | Versiones de texto |
| **Media Engine** | Genera imagen, carrusel o solicita video/avatar | Brief + copy + estilo visual | Assets multimedia |
| **Compliance Layer** | Valida longitud, branding, links, hashtags, riesgos | Borrador completo | Pieza aprobable o lista de errores |
| **Telegram Review** | Envía preview, recibe aprobar / corregir / rechazar | Pieza candidata | Decisión humana |
| **Publisher** | Publica en IG/FB y registra estado | Decisión aprobada + tokens | Post publicado + IDs externos |
| **Analytics** | Mide rendimiento y cierra feedback loop | Métricas de plataformas | Insights para próximas piezas |

### Diagrama de flujo del pipeline

```
┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│ Scheduler│───▶│Research Engine│───▶│ Strategy Engine  │───▶│ Content Engine  │
└──────────┘    └──────────────┘    └─────────────────┘    └───────┬────────┘
                                                                   │
                                                                   ▼
┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│ Analytics│◀───│  Publisher    │◀───│ Telegram Review  │◀───│ Media Engine    │
└──────────┘    └──────────────┘    └─────────────────┘    └────────────────┘
                                            │                      ▲
                                            │  (corrección)        │
                                            └──────────────────────┘
```

---

## 5. Flujo diario ideal

| Hora (aprox.) | Etapa | Detalle |
|---------------|-------|---------|
| **05:30 – 07:00** | Scheduler | Crea la corrida del día según zona horaria y ventanas configuradas. |
| **07:00 – 07:15** | Research Engine | Consolida noticias recientes, señales del nicho IA, temas propios y campañas activas. |
| **07:15 – 07:25** | Strategy Engine | Decide si conviene post simple, carrusel, reel corto, historia o video hablado. |
| **07:25 – 07:45** | Content Engine | Genera 1 propuesta principal y 1-2 variantes opcionales según objetivo (autoridad, tráfico, lead, venta, comunidad). |
| **07:45 – 08:00** | Media Engine | Produce el asset correspondiente y genera una vista previa compuesta. |
| **08:00** | Telegram Bot | Te envía la pieza con botones: **Aprobar**, **Corregir copy**, **Cambiar tono**, **Regenerar imagen**, **Pasar a video**, **Rechazar**. |
| *(si corrección)* | Loop de revisión | Tu instrucción se agrega como constraint explícito y se relanza solo la etapa necesaria. |
| *(tras aprobación)* | Publisher | Ejecuta la publicación en la ventana configurada. |
| *(post-publicación)* | Analytics | Registra desempeño inicial, enlace y trazabilidad. |

---

## 6. Circuito de aprobación en Telegram

> Este es el **componente diferencial** del producto. Debe sentirse como un "editor asistente" más que como un panel administrativo. La revisión ocurre en Telegram porque da velocidad operativa y baja fricción.

### Acciones disponibles

| Acción en Telegram | Comportamiento del sistema |
|--------------------|---------------------------|
| **Aprobar** | Bloquea la versión actual, firma auditoría y dispara publicación en el canal elegido. |
| **Corregir texto** | Abre modo conversación; la IA reescribe solo el copy/caption y devuelve preview nueva. |
| **Cambiar tono** | Regenera la pieza con un tono alternativo: técnico, provocador, didáctico, premium, cercano, etc. |
| **Regenerar imagen** | Mantiene brief y copy, pero pide nueva línea visual o nueva composición. |
| **Convertir a video** | Si el tema lo amerita, transforma el guion en clip con avatar o motion simple. |
| **Posponer** | Mueve la pieza a otra franja horaria o la pasa al backlog. |
| **Rechazar** | Cierra la corrida con motivo y guarda aprendizaje para afinar reglas futuras. |

### Recomendación UX

- **No envíes solo texto.** El bot debe mandar mini-preview del copy + thumbnail + metadatos clave: canal, objetivo, CTA, tono y fuente del tema.
- Usa **botones inline** para la decisión rápida y mensajes libres solo para feedback abierto.
- Cada revisión debe conservar **versionado**: v1, v2, v3, con diff del copy y del asset.

---

## 7. Modelo de datos base

Desde el inicio conviene diseñar entidades separadas para campañas, corridas, versiones y publicaciones. Eso te permitirá medir qué prompt, qué tono y qué tipo de asset convierten mejor.

| Entidad | Campos clave sugeridos |
|---------|------------------------|
| **workspace** | `id`, `nombre`, `timezone`, `branding`, `objetivos`, `canales_activos` |
| **brand_profile** | `voz`, `tono`, `claims_permitidos`, `cta_base`, `temas_prohibidos`, `hashtags` |
| **content_theme** | `nombre`, `keywords`, `audiencia`, `prioridad`, `formatos_preferidos` |
| **campaign** | `objetivo`, `oferta`, `landing`, `ventana_activa`, `kpi_esperado` |
| **editorial_run** | `fecha`, `estado`, `origen`, `prioridad`, `resumen_research` |
| **content_brief** | `ángulo`, `formato`, `cta`, `referencias`, `prompt_semilla` |
| **content_version** | `copy`, `caption`, `hook`, `título`, `versión`, `score`, `feedback_humano` |
| **media_asset** | `tipo`, `prompt`, `proveedor`, `url`, `status`, `metadatos` |
| **approval_event** | `quién_aprobó`, `cuándo`, `comentario`, `canal_telegram` |
| **publication** | `red`, `post_id_externo`, `permalink`, `fecha`, `status`, `métricas` |
| **job_queue_log** | `tipo_job`, `intento`, `error`, `latencia`, `correlación` |
| **api_credential** | `proveedor`, `secreto_cifrado`, `expiración`, `permisos` |

### Diagrama relacional simplificado

```
workspace
  └── brand_profile
  └── content_theme
  └── campaign
        └── editorial_run
              └── content_brief
                    └── content_version (v1, v2, v3…)
                          └── media_asset
              └── approval_event
              └── publication
  └── api_credential
  └── job_queue_log
```

---

## 8. Motor de research y actualidad

La calidad del research determina gran parte del valor del contenido. No basta con un prompt genérico al LLM.

### Fuentes

| Tipo | Ejemplos |
|------|----------|
| **Fuentes primarias** | Feeds RSS curados, blogs oficiales de empresas de IA, documentación de productos, changelogs, medios especializados. |
| **Fuentes secundarias** | Agregadores, newsletters, resúmenes, tendencias sociales, watchlists por keyword. |

### Pipeline de research

1. **Recolección:** crawl/fetch de fuentes configuradas.
2. **Scoring:** relevancia para tu nicho, novedad, potencial de engagement, cercanía con tus productos, riesgo reputacional.
3. **Normalización:** resumir cada noticia a formato interno común con: `título`, `fuente`, `fecha`, `link`, `puntos_clave`, `propuesta_de_ángulo`.
4. **Guardrails:** evitar inventar datos, exigir fecha/fuente en noticias, bajar prioridad a rumores.

### Patrones recomendados

- **Research primero, generación después.** No pedirle al modelo "habla de la noticia del día" sin pasarle una ficha estructurada.
- **Guardar snapshots** de las fuentes usadas para que el sistema sea auditable y repetible.
- **Separar "trending" de "evergreen":** un día puede publicar actualidad y otro puede publicar autoridad educativa.

---

## 9. Sistema de tono, temática y objetivos

El usuario debe poder configurar la línea editorial sin tocar prompts complejos. Modelar presets de tono, audiencias y tipos de resultado.

| Dimensión | Ejemplos |
|-----------|----------|
| **Temática** | IA general, automatización, agentes, productividad, empleos del futuro, casos de negocio, desarrollo con IA |
| **Tono** | Didáctico, técnico, aspiracional, polémico medido, premium, cercano, mentor, vendedor suave |
| **Objetivo** | Autoridad, captación, tráfico, venta, registro a comunidad, descarga de ebook |
| **Formato** | Post simple, carrusel, reel, historia, clip con avatar, video corto tipo news |
| **CTA** | Únete al canal, comenta, guarda, comparte, visita landing, responde palabra clave |

---

## 10. Generación de imágenes y carruseles

No todas las piezas deben ser "arte generativo". Para resultados de nivel profesional conviene combinar plantillas de marca, composición automatizada y, cuando aporte valor, generación visual por IA.

### Componentes del pipeline visual

| Componente | Descripción |
|------------|-------------|
| **Plantillas base de carrusel** | Portada, 3-5 slides de desarrollo, cierre con CTA. |
| **Sistema visual configurable** | Tipografías, paleta, márgenes, overlays, estilos de portada y marcos de branding. |
| **Motor de composición** | Renderiza carruseles a partir de JSON estructurado, no solo de una imagen plana. |
| **Generación IA** | Solo cuando sume: fondos conceptuales, ilustraciones editoriales, metáforas visuales, escenas futuristas. |
| **Postproceso** | Compresión, tamaños por red, thumbnails y validación de safe zones. |

---

## 11. Videos y avatar hablado

El video debe entrar como una **capacidad premium** del pipeline, no como obligación diaria. Úsalo cuando el tema tenga alto potencial de autoridad o cuando quieras humanizar el mensaje.

### Modos de video

| Modo | Cuándo usarlo | Pipeline sugerido |
|------|---------------|-------------------|
| **Video news corto** | Novedad importante del día | Research → guion 30-45s → avatar → subtítulos → preview Telegram |
| **Clip educativo** | Explicar concepto o herramienta | Brief → guion por bloques → avatar o voiceover → render vertical |
| **Video CTA** | Empujar canal, curso o comunidad | Copy persuasivo → avatar → cierre con branding y CTA |
| **Hybrid motion** | Cuando no quieres avatar | Slides + voz sintética/natural + motion graphics simple |

### Nota operativa

- Los videos suelen tener **más costo, más tiempo de render y más riesgo operativo** que una imagen o carrusel.
- Pon reglas: por ejemplo **2 o 3 videos por semana**, no necesariamente todos los días.
- Mantén el guion en un formato estructurado para **reutilizarlo como post escrito o email corto**.

---

## 12. Publicación a Instagram y Facebook

La publicación debe encapsularse detrás de un **adaptador por red social**. Así evitas que la lógica del negocio dependa directamente del proveedor.

### Requisitos del adaptador

- Normalizar assets y metadatos antes del publish.
- Controlar precondiciones: tokens válidos, formatos admitidos, límite de caracteres, duración y dimensiones.
- Registrar payload enviado, respuesta externa y permalink.
- Soportar estados: `queued` → `publishing` → `published` / `failed` → `retrying` / `needs_manual_attention`.
- Tener reintentos con backoff, pero **nunca duplicar publicación ya confirmada**.

---

## 13. Observabilidad y seguridad

| Área | Prácticas recomendadas |
|------|------------------------|
| **Secrets** | Cifrar tokens/API keys, rotación periódica, scopes mínimos y separación por entorno. |
| **Auditoría** | Log de quién aprobó, qué se publicó, con qué versión y en qué momento. |
| **Errores** | Tracking centralizado, correlación por job y alertas en Telegram/Discord/email. |
| **Calidad** | Checks de longitud, validación de links, bloqueo de prompts peligrosos y score de confianza. |
| **Cumplimiento** | Respeto por límites de API, derechos de uso de media y trazabilidad de fuentes. |

---

## 14. Roadmap por fases

| Fase | Objetivo | Entregable real |
|------|----------|-----------------|
| **Fase 0** | Base SaaS | Auth, workspace, branding, temas, campañas y dashboard mínimo. |
| **Fase 1** | Research + copy | Generación diaria de propuesta textual con aprobación por Telegram. |
| **Fase 2** | Imagen / carrusel | Render automático de posts visuales con preview sólida. |
| **Fase 3** | Publicación real | Publicación aprobada en IG/FB con logs y reintentos. |
| **Fase 4** | Video / avatar | Clips hablados y pipeline multimedia más sofisticado. |
| **Fase 5** | Analytics + optimización | Aprendizaje por rendimiento, scoring y sugerencias automáticas. |
| **Fase 6** | Producto comercial | Multi-tenant, planes, límites, facturación y onboarding. |

---

## 15. Detalle de implementación por fases

---

### FASE 0 — Base SaaS

> **Objetivo:** dejar la infraestructura mínima funcional con auth, modelo de datos, panel de administración básico y configuración editorial.

#### Fase 0.1 — Inicialización del monorepo y tooling

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear monorepo con Turborepo (o similar) | Estructura `apps/` y `packages/` según la arquitectura de carpetas. |
| 2 | Configurar TypeScript compartido | `tsconfig.base.json` en la raíz, extendido por cada app/package. |
| 3 | Configurar ESLint + Prettier | Reglas unificadas para todo el repo. |
| 4 | Configurar husky + lint-staged | Pre-commit hooks para calidad de código. |
| 5 | Configurar CI básico | GitHub Actions: lint, typecheck, build en cada PR. |
| 6 | Configurar variables de entorno | `.env.example` en cada app, soporte para `.env.local`. |

#### Fase 0.2 — Supabase: proyecto, auth y base de datos

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear proyecto en Supabase | Región adecuada, naming consistente, guardar credenciales seguras. |
| 2 | Configurar auth en Supabase | Habilitar email + magic link. Preparar para OAuth si se necesita luego. |
| 3 | Configurar Supabase Storage | Bucket privado para media assets. Políticas RLS básicas. |
| 4 | Habilitar Supabase Queues (pgmq) | Verificar disponibilidad, crear colas base: `editorial_jobs`, `media_jobs`, `publish_jobs`. |

#### Fase 0.3 — Prisma: esquema inicial y migraciones

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Inicializar `packages/db` con Prisma | `prisma init`, conectar a Supabase Postgres. |
| 2 | Definir modelos iniciales | `Workspace`, `BrandProfile`, `ContentTheme`, `Campaign`, `ApiCredential`. |
| 3 | Crear primera migración | `prisma migrate dev --name init`. |
| 4 | Generar Prisma Client y exportarlo | Re-exportar desde `packages/db` para uso en apps. |
| 5 | Crear seed básico | Workspace de prueba, brand profile, 3-5 temas iniciales. |

#### Fase 0.4 — Next.js: panel mínimo

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `apps/web` con Next.js (App Router) | Typescript, Tailwind CSS, estructura de carpetas por feature. |
| 2 | Integrar auth de Supabase | Login/logout, protección de rutas, middleware de sesión. |
| 3 | Página: Dashboard | Vista vacía con métricas placeholder y acceso rápido a secciones. |
| 4 | Página: Workspace Settings | Nombre, timezone, canales activos, branding visual básico. |
| 5 | Página: Brand Profile | Formulario: voz, tono, claims, CTA base, temas prohibidos, hashtags. |
| 6 | Página: Temas | CRUD de `ContentTheme`: nombre, keywords, audiencia, prioridad, formatos. |
| 7 | Página: Campañas | CRUD de `Campaign`: objetivo, oferta, landing, ventana activa, KPI. |
| 8 | Página: API Credentials | Gestión de tokens (cifrados): Meta, Telegram, LLM, imagen, video. |
| 9 | Deploy en Vercel | Conectar repo, configurar env vars, dominio provisional. |

#### Fase 0.5 — NestJS: esqueleto del backend

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `apps/api` con NestJS | Estructura modular, config module, logger, health check. |
| 2 | Integrar Prisma Client | Servicio `PrismaService` con ciclo de vida NestJS. |
| 3 | Módulo: Workspaces | Acceso al workspace activo, validación de permisos. |
| 4 | Módulo: Campaigns | Lógica de negocio de campañas, reglas de activación. |
| 5 | Módulo: Queue Consumer base | Consumidor genérico para pgmq con retry y logging. |
| 6 | Deploy inicial | Railway / Fly.io / Docker en VPS, con health check accesible. |

#### Entregables Fase 0

- [x] Monorepo funcional con builds exitosos.
- [x] Auth working: login → dashboard protegido.
- [x] CRUD completo: workspace, brand, temas, campañas, credenciales.
- [x] Prisma schema migrado con seed de datos de prueba.
- [x] NestJS arrancado con health check y conexión a Postgres.
- [x] Deploy: panel en Vercel, API en host propio.

---

### FASE 1 — Research + Copy + Aprobación por Telegram

> **Objetivo:** generar diariamente una propuesta textual (copy, caption, hook) basada en research de actualidad, y enviarla a Telegram para aprobación humana.

#### Fase 1.1 — Motor de research

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `packages/ai` | Estructura: adapters (LLM), prompts, evaluators. |
| 2 | Adapter LLM abstracto | Interface `LLMAdapter` con métodos `complete()`, `chat()`. Implementación inicial para el proveedor elegido. Debe ser intercambiable. |
| 3 | Módulo NestJS: ResearchEngine | Servicio que orquesta el research diario. |
| 4 | Configurar fuentes RSS | Modelo `ResearchSource` en Prisma. CRUD en panel para agregar/quitar fuentes. |
| 5 | Fetch de fuentes | Worker que parsea RSS, extrae artículos recientes (últimas 24h). |
| 6 | Scoring de noticias | Scoring por: relevancia al nicho, novedad, potencial de engagement, cercanía con productos, riesgo reputacional. |
| 7 | Normalización a ficha interna | Formato: `{ titulo, fuente, fecha, link, puntos_clave, propuesta_angulo }`. |
| 8 | Guardrails de research | No inventar datos, exigir fecha/fuente, bajar prioridad a rumores. |
| 9 | Snapshot de fuentes | Guardar snapshot del research usado para auditoría y repetibilidad. |
| 10 | Separar trending vs evergreen | Flag en temas: `trending` o `evergreen`. Lógica de alternancia en el calendario. |

#### Fase 1.2 — Strategy Engine

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Módulo NestJS: StrategyEngine | Recibe research + brand profile + campañas activas. |
| 2 | Selección de ángulo | LLM elige el mejor ángulo del día según prioridades y últimas publicaciones. |
| 3 | Selección de formato | Post simple, carrusel, reel (decisión basada en tipo de contenido y reglas). |
| 4 | Definición de CTA | Elige CTA según objetivo de la campaña activa. |
| 5 | Generación de brief creativo | Output: `ContentBrief` con ángulo, formato, cta, referencias, prompt semilla. |
| 6 | Persistir brief | Guardar `ContentBrief` en BD vinculado al `EditorialRun`. |

#### Fase 1.3 — Content Engine

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Módulo NestJS: ContentEngine | Recibe brief, genera versiones de copy. |
| 2 | Generación de propuesta principal | LLM genera: hook, copy, caption, título, hashtags sugeridos. |
| 3 | Generación de 1-2 variantes | Variantes con diferente tono u objetivo para comparación. |
| 4 | Modelo `ContentVersion` | Guardar cada versión con: copy, caption, hook, título, versión (v1, v2…), score. |
| 5 | Compliance básico de texto | Validar: longitud de caption (IG = 2200 chars), hashtags (máx 30), links permitidos. |

#### Fase 1.4 — Scheduler y Editorial Run

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Modelo `EditorialRun` en Prisma | fecha, estado (`pending`, `research`, `strategy`, `content`, `review`, `approved`, `published`, `rejected`), origen, prioridad. |
| 2 | Vercel Cron Job | Cron que dispara a las 05:30-07:00 (configurable por workspace timezone). |
| 3 | Endpoint de disparo | Route Handler en Next.js que encola job en pgmq para el NestJS. |
| 4 | Orquestador de corrida | NestJS consume el job y ejecuta: Research → Strategy → Content → Telegram Review. Persiste estado entre cada paso. |
| 5 | Modelo `JobQueueLog` | Registro de cada job: tipo, intento, error, latencia, correlación al `EditorialRun`. |

#### Fase 1.5 — Bot de Telegram

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `packages/telegram` | Bot handlers, review workflows, formatters. |
| 2 | Registrar bot en BotFather | Obtener token, configurar comandos básicos. |
| 3 | Módulo NestJS: TelegramReview | Servicio de envío y recepción de mensajes. |
| 4 | Envío de preview | Mensaje compuesto: copy + metadatos (canal, objetivo, CTA, tono, fuente). |
| 5 | Botones inline | `Aprobar`, `Corregir texto`, `Cambiar tono`, `Posponer`, `Rechazar`. |
| 6 | Handler: Aprobar | Bloquea versión, registra `ApprovalEvent`, marca `EditorialRun` como `approved`. |
| 7 | Handler: Corregir texto | Abre modo conversación. La instrucción se pasa como constraint al Content Engine. Relanza solo esa etapa. Devuelve nueva preview (v2, v3…). |
| 8 | Handler: Cambiar tono | Regenera con preset de tono alternativo. Devuelve preview nueva. |
| 9 | Handler: Posponer | Mueve a otra franja horaria o al backlog. |
| 10 | Handler: Rechazar | Cierra corrida con motivo. Guarda feedback para afinación futura. |
| 11 | Versionado visible | Cada revisión muestra: versión actual, diff respecto a la anterior. |
| 12 | Webhook de Telegram | Configurar webhook apuntando al NestJS (o proxy via Vercel). |

#### Fase 1.6 — Vista en panel web

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Página: Cola editorial | Lista de `EditorialRun` del día con estado actual. |
| 2 | Página: Detalle de corrida | Ver research, brief, versiones de copy, approval events, timeline. |
| 3 | Página: Historial | Filtros por fecha, estado, tema, campaña. |

#### Entregables Fase 1

- [x] Research diario automatizado con scoring y normalización.
- [x] Strategy engine generando brief creativo coherente.
- [x] Content engine produciendo copy con variantes.
- [x] Scheduler disparando corrida editorial a hora configurada.
- [x] Bot de Telegram enviando preview con botones funcionales.
- [x] Loop de corrección funcionando (corregir → regenerar → nueva preview).
- [x] Versionado de copies persistido en BD.
- [x] Panel web mostrando cola, detalle y historial.

---

### FASE 2 — Imagen y Carrusel

> **Objetivo:** agregar generación visual automatizada al pipeline. Cada propuesta ahora incluye imagen o carrusel, no solo texto.

#### Fase 2.1 — Infraestructura de media

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `packages/media` | Adapters para: generación de imagen IA, Cloudinary, composición de carruseles. |
| 2 | Configurar Cloudinary | Cuenta, API keys, presets de transformación para social media. |
| 3 | Modelo `MediaAsset` en Prisma | tipo, prompt_usado, proveedor, url_original, url_optimizada, status, metadatos. |
| 4 | Adapter de imagen IA abstracto | Interface `ImageGeneratorAdapter` con método `generate(prompt, options)`. Implementación para proveedor elegido. |
| 5 | Storage pipeline | Generar imagen → subir a Supabase Storage → transformar en Cloudinary → guardar URLs finales. |

#### Fase 2.2 — Sistema de plantillas de carrusel

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Definir sistema de plantillas | JSON schema para slides: portada, contenido (3-5), cierre CTA. |
| 2 | Configurar branding visual | Tipografías, paleta de colores, márgenes, overlays, marcos. Almacenar en `BrandProfile`. |
| 3 | Motor de composición | Servicio que recibe JSON estructurado y renderiza imágenes de cada slide. (Sharp, Satori, Puppeteer, o servicio externo). |
| 4 | Render de carrusel completo | Genera set de imágenes individuales listas para IG carrusel. |
| 5 | Plantillas iniciales | Crear 3-5 plantillas base: educativo, news, CTA, autoridad, polémico. |

#### Fase 2.3 — Integración al pipeline editorial

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Módulo NestJS: MediaEngine | Recibe brief + copy + estilo visual. Decide: imagen simple o carrusel. |
| 2 | Prompt de imagen desde brief | LLM genera prompt visual a partir del brief creativo y el copy aprobado. |
| 3 | Generación IA condicional | Solo cuando el tema lo amerite. Si no, usar plantilla + composición. |
| 4 | Postproceso de assets | Compresión, resize por red (1080x1080, 1080x1350), thumbnails, validación safe zones. |
| 5 | Cola `media_jobs` | Desacoplar generación de media del flujo principal. Retry con backoff. |
| 6 | Vincular `MediaAsset` a `ContentVersion` | Relación 1:N entre versión de contenido y sus assets. |

#### Fase 2.4 — Preview mejorada en Telegram

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Envío de imagen/carrusel en preview | Bot envía thumbnail de la pieza visual junto al copy. |
| 2 | Nuevo botón: Regenerar imagen | Mantiene brief y copy, regenera solo visual. |
| 3 | Preview compuesta | Mockup que simule cómo se verá en el feed de IG/FB. |

#### Fase 2.5 — Vista en panel web

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Galería de assets | Página para ver todos los media generados, filtrar por tipo/fecha. |
| 2 | Preview visual en detalle de corrida | Ver imagen/carrusel junto al copy en la vista de editorial run. |
| 3 | Gestión de plantillas | CRUD básico de plantillas de carrusel desde el panel. |

#### Entregables Fase 2

- [x] Generación de imágenes IA funcionando y almacenada.
- [x] Sistema de plantillas de carrusel con al menos 3 plantillas.
- [x] Motor de composición rinde carruseles desde JSON.
- [x] Pipeline: brief → prompt visual → imagen → postproceso → storage.
- [x] Preview en Telegram incluye thumbnail visual.
- [x] Botón "Regenerar imagen" funcional.
- [x] Galería de assets en el panel web.

---

### FASE 3 — Publicación Real en Instagram y Facebook ✅ Completada

> **Objetivo:** conectar con la Graph API de Meta para publicar contenido aprobado de forma automática, con manejo robusto de estados y errores.

#### Fase 3.1 — Adaptadores de publicación ✅

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Crear `packages/publishers` | Adapters para Instagram y Facebook. Interface `PublisherAdapter`. |
| 2 | Adapter Instagram | Implementar Content Publishing API de Meta: single image, carousel, reels. |
| 3 | Adapter Facebook | Implementar Graph API de Facebook: post con imagen, album, video. |
| 4 | Normalización pre-publish | Validar: tokens válidos, formatos admitidos, límite de caracteres, dimensiones, duración. |
| 5 | Configuración de tokens Meta | Flujo de obtención de long-lived token. Almacenar cifrado en `ApiCredential`. |
| 6 | Flujo OAuth con Meta | (Opcional Fase 0) Implementar login con Facebook para obtener permisos de publicación. |

#### Fase 3.2 — Módulo de publicación en NestJS ✅

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Módulo NestJS: Publisher | Orquesta la publicación tras aprobación. |
| 2 | Modelo `Publication` en Prisma | red, post_id_externo, permalink, fecha, status, payload_enviado, respuesta_externa, métricas. |
| 3 | Estados de publicación | `queued` → `publishing` → `published` / `failed` → `retrying` / `needs_manual_attention`. |
| 4 | Cola `publish_jobs` | Job desacoplado con reintentos y backoff exponencial. |
| 5 | Idempotencia | Verificar que no se duplique publicación ya confirmada. Check por `post_id_externo`. |
| 6 | Registro de payload | Guardar exactamente qué se envió a la API y qué respondió. Para debug y auditoría. |
| 7 | Alertas de fallo | Si falla tras N reintentos: notificar por Telegram con detalle del error. |

#### Fase 3.3 — Flujo post-aprobación ✅

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Trigger de publicación | Cuando `ApprovalEvent` = `approved`, encolar `publish_job`. |
| 2 | Ventana de publicación | Respetar hora configurada. Si apruebas a las 08:00 pero la ventana es 12:00, programar. |
| 3 | Selección de canal | `EditorialRun` indica canales destino (IG, FB, ambos). Crear un job por canal. |
| 4 | Confirmación post-publish | Telegram envía mensaje: "Publicado en IG ✓ — [enlace]" con permalink. |

#### Fase 3.4 — Panel web: publicaciones ✅

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Página: Publicaciones | Lista con filtros: red, estado, fecha. |
| 2 | Detalle de publicación | Permalink, payload, respuesta API, estado, timestamps. |
| 3 | Acción manual: reintentar | Botón para re-encolar un publish fallido desde el panel. |
| 4 | Acción manual: publicar manualmente | Para piezas aprobadas que no se publicaron por error. |

#### Entregables Fase 3

- [x] Adapter Instagram publicando single image y carousel.
- [x] Adapter Facebook publicando post con imagen.
- [x] Flujo completo: aprobación Telegram → publicación automática.
- [x] Estados de publicación con reintentos y idempotencia.
- [x] Notificación Telegram post-publicación con permalink.
- [x] Panel web: lista, detalle y acciones manuales sobre publicaciones.
- [x] Tokens Meta almacenados cifrados con rotación controlada.

---

### FASE 4 — Video y Avatar Hablado ✅ Completada

> **Objetivo:** incorporar video como capacidad premium del pipeline. No obligatorio diario, pero disponible cuando el tema lo amerite.

#### Fase 4.1 — Infraestructura de video

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Adapter HeyGen (o similar) | Interface `AvatarVideoAdapter` con método `generate(script, options)`. |
| 2 | Adapter de voz sintética | Para modo hybrid motion (sin avatar, solo voiceover). |
| 3 | Configurar avatar y voz | Seleccionar avatar, voz, idioma y estilo. Almacenar config en `BrandProfile`. |
| 4 | Modelo de guion estructurado | `VideoScript`: bloques de texto, timing, indicaciones visuales, CTA de cierre. |

#### Fase 4.2 — Pipeline de video

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Generación de guion | LLM genera guion de 30-45s a partir del brief, respetando formato estructurado. |
| 2 | Solicitud de render | Enviar guion a HeyGen API. Manejar states: `queued`, `rendering`, `completed`, `failed`. |
| 3 | Subtítulos automáticos | Generar subtítulos quemados o como .srt para accesibilidad. |
| 4 | Postproceso de video | Resize vertical (9:16), branding overlay, CTA de cierre, compresión. |
| 5 | Cola `video_jobs` | Separada de `media_jobs` porque tiene tiempos más largos y costos distintos. |
| 6 | Reglas de frecuencia | Máx. 2-3 videos por semana. Configurar en workspace. |

#### Fase 4.3 — Integración al pipeline editorial

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Strategy Engine: decisión de video | Cuando scoring alto + tema adecuado → sugerir formato video. |
| 2 | Botón Telegram: Convertir a video | Si pieza textual aprobada, opción de generar versión video. |
| 3 | Preview de video en Telegram | Enviar video corto o link a preview antes de publicar. |
| 4 | Publisher: soporte Reels IG | Publicar como Reel en Instagram via Content Publishing API. |
| 5 | Publisher: soporte Video FB | Publicar video en Facebook via Graph API. |

#### Fase 4.4 — Modos de video

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Video news corto | Research → guion 30-45s → avatar → subtítulos → preview. |
| 2 | Clip educativo | Brief → guion por bloques → avatar/voiceover → render vertical. |
| 3 | Video CTA | Copy persuasivo → avatar → cierre con branding y CTA. |
| 4 | Hybrid motion | Slides animados + voz sintética + motion graphics simple. |

#### Fase 4.5 — Reutilización de guion

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Exportar guion como post escrito | Transformar `VideoScript` a formato de post/caption para redes. |
| 2 | Exportar guion como email corto | Adaptar texto del guion a formato newsletter/email. |

#### Entregables Fase 4

- [x] Adapter de avatar video funcional (HeyGen o similar).
- [x] Generación de guion estructurado desde brief.
- [x] Render de video con subtítulos y branding.
- [x] Publicación de Reels en IG y videos en FB.
- [x] Botón "Convertir a video" en Telegram funcional.
- [x] Reglas de frecuencia de video configurables.
- [x] Reutilización de guion como post escrito y email.

---

### FASE 5 — Analytics y Optimización

> **Objetivo:** cerrar el feedback loop. Medir rendimiento de publicaciones y usar esos datos para mejorar futuras decisiones del pipeline.

#### Fase 5.1 — Recolección de métricas

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Módulo NestJS: Analytics | Servicio que consulta métricas de las APIs de Meta. |
| 2 | Cron de recolección | Cada 6-12h post publicación: fetch de likes, comments, shares, saves, reach, impressions. |
| 3 | Modelo de métricas | Extender `Publication` con: `likes`, `comments`, `shares`, `saves`, `reach`, `impressions`, `engagement_rate`. |
| 4 | Métricas incrementales | Guardar snapshots temporales (2h, 6h, 24h, 48h, 7d) para ver curva de rendimiento. |

#### Fase 5.2 — Dashboard analítico

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Panel: Métricas generales | Engagement promedio, publicaciones por semana, mejor horario, mejor formato. |
| 2 | Panel: Rendimiento por tema | Qué temáticas generan más engagement. |
| 3 | Panel: Rendimiento por tono | Qué tonos convierten mejor (didáctico vs polémico vs técnico…). |
| 4 | Panel: Rendimiento por formato | Post simple vs carrusel vs reel vs video. |
| 5 | Panel: Rendimiento por CTA | Qué llamados a la acción generan más clicks/respuestas. |
| 6 | Panel: Cohortes de contenido | news, educativo, polémico, CTA, venta — performance comparada. |

#### Fase 5.3 — Feedback loop al pipeline

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Scoring predictivo | Usar datos históricos para asignar score esperado a nuevas propuestas. |
| 2 | Sugerencias automáticas | "Los carruseles educativos los martes tienen 40% más engagement". |
| 3 | Refinamiento de research scoring | Ajustar pesos de scoring de noticias según rendimiento pasado de temas similares. |
| 4 | Optimización de horario | Calcular mejores ventanas de publicación por día y tipo de contenido. |
| 5 | Informe semanal en Telegram | Resumen automático: mejores posts, peores posts, recomendaciones. |

#### Entregables Fase 5

- [ ] Recolección automática de métricas de IG/FB.
- [ ] Dashboard con métricas por tema, tono, formato, CTA y cohorte.
- [ ] Scoring predictivo para nuevas propuestas.
- [ ] Sugerencias automáticas basadas en datos.
- [ ] Informe semanal enviado por Telegram.

---

### FASE 6 — Producto Comercial (Multi-tenant)

> **Objetivo:** convertir la plataforma en un producto SaaS vendible, con múltiples workspaces, planes, límites y facturación.

#### Fase 6.1 — Multi-tenancy real

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Aislamiento por workspace | Todas las queries filtradas por `workspace_id`. RLS en Supabase reforzado. |
| 2 | Roles y permisos | Owner, editor, viewer por workspace. RBAC en backend y frontend. |
| 3 | Invitaciones | Invitar usuarios a workspace por email. |
| 4 | Workspace switching | UI para cambiar entre workspaces si un usuario tiene acceso a varios. |

#### Fase 6.2 — Planes y límites

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Modelo `Plan` y `Subscription` | Planes: Free, Pro, Enterprise. Límites por: publicaciones/mes, videos/mes, fuentes, canales. |
| 2 | Enforcement de límites | Middleware que verifica uso vs plan activo antes de ejecutar jobs costosos. |
| 3 | Página de planes | Comparativa de planes, call to action para upgrade. |

#### Fase 6.3 — Facturación

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Integración Stripe | Checkout, portal de cliente, webhooks de suscripción. |
| 2 | Modelo `Invoice` / `Payment` | Registro de pagos y facturas. |
| 3 | Gestión de suscripción | Upgrade, downgrade, cancelación, período de gracia. |

#### Fase 6.4 — Onboarding

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Flujo de onboarding guiado | Wizard: crear workspace → configurar brand → conectar canales → configurar temas → conectar Telegram. |
| 2 | Templates de brand profile | Presets de industry: tech, coaching, e-commerce, personal brand. |
| 3 | Docs y help center | Documentación de uso, FAQs, video tutoriales. |

#### Fase 6.5 — Hardening

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | Rate limiting | Por tenant, por endpoint, por API externa. |
| 2 | Monitoring producción | APM, error tracking (Sentry o similar), uptime checks. |
| 3 | Backups | Verificar política de backups de Supabase Postgres. Backup adicional si es necesario. |
| 4 | GDPR / protección de datos | Política de privacidad, exportación de datos, eliminación de cuenta. |
| 5 | SLA y status page | Página de estado público para clientes. |

#### Entregables Fase 6

- [ ] Multi-tenancy con aislamiento completo por workspace.
- [ ] Roles y permisos (RBAC) funcionales.
- [ ] Planes con límites enforced.
- [ ] Facturación con Stripe integrada.
- [ ] Onboarding guiado para nuevos usuarios.
- [ ] Rate limiting, monitoring y backups en producción.

---

## 15. MVP recomendado para lanzar rápido

Para no caer en sobreingeniería, el MVP debe enfocarse en **una sola promesa**:

> **"Cada día recibes una propuesta lista para aprobar y publicar."**

### Alcance del MVP

| Aspecto | Límite |
|---------|--------|
| Redes sociales | Solo Instagram y Facebook. |
| Workspaces | Solo un workspace inicialmente. |
| Formatos | Post simple + imagen y carrusel básico. |
| Research | Limitado a 5-10 fuentes curadas + temas evergreen. |
| Aprobación | Vía Telegram con 5 acciones máximas. |
| Publicación | Con registro de permalink + engagement inicial. |
| Panel | Campañas, cola, historial, assets y configuración editorial. |

### Correspondencia con fases

El MVP equivale a completar **Fase 0 + Fase 1 + Fase 2 (básico) + Fase 3**.

---

## 16. Backlog premium / alto impacto

Funcionalidades para versiones posteriores al MVP, ordenadas por impacto estimado:

| # | Feature | Impacto |
|---|---------|---------|
| 1 | **A/B testing de hooks y captions** | Optimización directa de engagement. |
| 2 | **Calendario editorial inteligente** | Publicar en horarios de mejor rendimiento. |
| 3 | **Biblioteca de avatares, voces y personajes** | Variedad visual y humanización de marca. |
| 4 | **Campañas persistentes** | Secuencias de publicaciones coordinadas hacia un objetivo. |
| 5 | **Variación automática por red** | Una idea → adaptaciones para IG, FB, Threads, LinkedIn, X. |
| 6 | **Agente interno de productos** | Sugiere qué producto promocionar según contexto del día. |
| 7 | **Dashboards con cohortes de contenido** | news, educativo, polémico, CTA, venta — análisis segmentado. |

---

## 17. Riesgos reales y cómo mitigarlos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Contenido genérico** | Alta | Alto | Usar brand profile fuerte, research estructurado y feedback humano acumulado. |
| **Costos de media/video** | Media | Medio | Reglas de frecuencia, caché de assets y colas separadas por costo. |
| **Fallos de publicación** | Media | Alto | Estados intermedios, idempotencia, reintentos controlados y revisión manual. |
| **Noticias incorrectas o desactualizadas** | Media | Alto | Exigir fuente/fecha y no publicar actualidad sin snapshot previo. |
| **Demasiada complejidad desde el inicio** | Alta | Alto | MVP enfocado y roadmap por fases, no todo junto. |
| **Límites de API de Meta** | Baja | Medio | Respetar rate limits, monitorear cuotas y tener fallback manual. |
| **Dependencia de un proveedor LLM** | Media | Medio | Adapter abstracto que permita cambiar de proveedor sin reescribir lógica. |
| **Token expirado de Meta** | Media | Alto | Alertas de expiración, auto-renovación de long-lived tokens, fallback manual. |

---

## 18. Recomendación final de implementación

Construir la plataforma en **cuatro planos**:

### Plano Producto
- **Next.js en Vercel** para panel, autenticación, preview, gestión editorial y APIs livianas.

### Plano Operacional
- **NestJS + Supabase Postgres/Queues/Storage** para colas, research, generación, media, aprobación y publicación.

### Plano Multimedia
- Proveedor de imágenes IA + **Cloudinary** para transformaciones + proveedor de avatar/video cuando la pieza lo requiera.

### Plano de Control
- **Telegram** como consola de aprobación humana y canal de alertas.

> Ese enfoque da velocidad de salida, capacidad de escalar por módulos y una base muy comercializable si mañana quieres convertirlo en producto para terceros.

---

## 19. Arquitectura de carpetas sugerida

### Monorepo

```
root/
├── apps/
│   ├── web/                    → Next.js admin + preview + settings
│   └── api/                    → NestJS core orchestration
├── packages/
│   ├── db/                     → Prisma schema + client + seeds
│   ├── shared/                 → tipos, DTOs, eventos, utilidades
│   ├── ai/                     → prompts, adapters LLM, evaluators
│   ├── media/                  → image/video/avatar adapters
│   ├── publishers/             → instagram/facebook adapters
│   └── telegram/               → bot handlers + review workflows
├── .github/
│   └── workflows/              → CI/CD pipelines
├── turbo.json                  → Turborepo config
├── package.json                → Root package.json
├── tsconfig.base.json          → TypeScript base config
├── .env.example                → Variables de entorno de referencia
└── README.md
```

### Detalle de cada directorio

| Directorio | Contenido principal |
|------------|---------------------|
| `apps/web` | Pages, components, hooks, API routes (ligeros), middleware auth. |
| `apps/api` | Modules NestJS: scheduler, research, strategy, content, media, publisher, telegram, analytics. |
| `packages/db` | `schema.prisma`, migraciones, `seed.ts`, PrismaClient re-exportado. |
| `packages/shared` | Tipos compartidos, DTOs, constantes, helpers, event types. |
| `packages/ai` | `LLMAdapter` interface, implementaciones por proveedor, prompt templates, scoring. |
| `packages/media` | `ImageGeneratorAdapter`, `CarouselRenderer`, `VideoAdapter`, Cloudinary utils. |
| `packages/publishers` | `PublisherAdapter` interface, `InstagramPublisher`, `FacebookPublisher`. |
| `packages/telegram` | Bot setup, inline keyboard builders, review handlers, formatters. |

---

## 20. Fuentes técnicas clave revisadas

| Fuente | Tema | Consultado |
|--------|------|------------|
| Vercel Cron Jobs Quickstart | Documentación de gestión y límites de cron jobs | Marzo 2026 |
| Meta for Developers — Instagram Platform | Content Publishing API y referencia IG User Media | Marzo 2026 |
| Telegram Bot API | Inline keyboards y documentación oficial del bot | Marzo 2026 |
| Supabase Queues / pgmq | Documentación de colas basadas en Postgres | Marzo 2026 |
| HeyGen API Documentation | Generación de avatar video | Marzo 2026 |
| Cloudinary Video Transformations | Documentación de transformaciones de video | Marzo 2026 |
| Prisma Guide for Next.js | Patrones de deployment con Prisma y Next.js | Marzo 2026 |

---

## Checklist global de progreso

| Fase | Estado | Descripción |
|------|--------|-------------|
| ✅ Fase 0 | **Completada** | Base SaaS: auth, workspace, branding, temas, campañas, dashboard. |
| ✅ Fase 1 | **Completada** | Research + copy + aprobación Telegram. |
| ✅ Fase 2 | **Completada** | Imagen y carrusel automatizado. |
| ☐ Fase 3 | Pendiente | Publicación real en IG/FB. |
| ☐ Fase 4 | Pendiente | Video y avatar hablado. |
| ☐ Fase 5 | Pendiente | Analytics y optimización. |
| ☐ Fase 6 | Pendiente | Producto comercial multi-tenant. |

---

*Documento generado como guía maestra de implementación. Cada fase debe completarse y validarse antes de iniciar la siguiente.*




Guía para crear tu app de Facebook/Meta:
1. Ir a developers.facebook.com

Logueate con tu cuenta de Facebook
Click en "My Apps" (arriba a la derecha)
2. Crear una nueva app

Click "Create App"
Seleccioná "Business" como tipo
Poné un nombre (e.g., "Automatismos")
Click "Create App"
3. Configurar Instagram Graph API

En el dashboard de tu app, buscá "Instagram Graph API" y hacé click en "Set Up"
También agregá el producto "Facebook Login for Business"
4. Obtener App ID y App Secret

Andá a Settings → Basic
Copiá el App ID y el App Secret
5. Configurar la redirect URI

En Facebook Login → Settings
En Valid OAuth Redirect URIs agregá:
6. Pegar en el .env

Una vez que tengas los dos valores, decime y los configuro:

META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
Importante: Tu cuenta de Facebook debe tener una Página creada y una cuenta de Instagram Business vinculada a esa página para que el OAuth descubra las cuentas automáticamente.