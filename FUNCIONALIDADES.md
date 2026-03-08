# 🧠 Syndra — Inventario Completo de Funcionalidades

> Plataforma SaaS de automatización de contenido para redes sociales.
> Estado actual al 8 de Marzo 2026.

---

## 1. AUTENTICACIÓN Y GESTIÓN DE USUARIOS

### 1.1 Registro y Login
- Registro con email/contraseña/nombre + selección de plan (Starter/Creator/Pro)
- Login con email/contraseña → retorna JWT access + refresh token
- Contraseñas hasheadas con **bcrypt** (12 rounds)
- **Tokens JWT**: access de 15 min, refresh de 7 días
- **Rotación de tokens** con tracking de familia (detecta reutilización de tokens)
- Soporte de **código de referido** en el registro (20% descuento para referidos)
- Cada usuario recibe un **código de referido único** auto-generado

### 1.2 Verificación de Email
- Envío de email de verificación vía **Resend**
- Link con token y 24h de expiración
- Opción de reenvío de verificación

### 1.3 Recuperación de Contraseña
- Flujo de "Olvidé mi contraseña" (anti-enumeración — siempre devuelve éxito)
- Link con token y 1h de expiración
- Admin puede generar links de reset para cualquier usuario

### 1.4 Guardias de Autenticación
- **AuthGuard** — valida JWT desde header `Authorization: Bearer` o cookie; modo dev con mock user
- **RolesGuard** — RBAC de dos capas: nivel plataforma (`ADMIN`, `COLLABORATOR`, `USER`) y nivel workspace (`OWNER`, `EDITOR`, `VIEWER`)
- **PlanThrottleGuard** — rate limiting por tier: FREE 30 req/min, PRO 120, ENTERPRISE 300
- **PlanLimitsGuard** — enforce de cuotas del plan (publicaciones, videos, fuentes, canales, editores)

### 1.5 Middleware (Next.js)
- Protege rutas `/dashboard/*` — redirige no autenticados a `/login`
- Rutas públicas: `/login`, `/register`, `/onboarding`, `/activate`, `/api`

---

## 2. WORKSPACE Y MULTI-TENANCY

### 2.1 Gestión de Workspaces
- Cada usuario recibe un **workspace** al registrarse
- Campos: nombre, slug, timezone, logo, color primario, objetivos, canales activos, industria
- Tabla `WorkspaceUser` con roles: `OWNER`, `EDITOR`, `VIEWER`
- Flag `isDefault` para workspace principal del usuario

### 2.2 Asistente de Onboarding
- Setup multi-paso: workspace → marca → canales → temas → plan
- **Presets por industria**: ecommerce, restaurante, fitness, inmobiliaria, tech, belleza, genérico
- Cada preset rellena temas de contenido, tonos, hashtags
- Auto-crea perfil de marca, temas y credenciales API
- Endpoint de status que verifica completitud de cada paso

### 2.3 Equipo e Invitaciones
- **Invitar miembros** por email con rol (EDITOR por defecto)
- Tokens de invitación con expiración
- Aceptar invitación (endpoint público con token + userId)
- Revocar invitaciones, actualizar roles, remover miembros
- Solo OWNER puede gestionar; EDITOR puede ver invitaciones
- Estados: PENDING, ACCEPTED, EXPIRED, REVOKED

---

## 3. MARCA E IDENTIDAD DE CONTENIDO

### 3.1 Perfil de Marca
- Por workspace: descripción de voz, tono, claims permitidos, CTA base, temas prohibidos, hashtags
- JSON de estilo visual (tipografía, colores, etc.)

### 3.2 Personas IA (`UserPersona`)
- Personalidades IA configurables por usuario
- Campos: nombre de marca, descripción, tono (array), experticia (array), estilo visual, audiencia objetivo, temas a evitar, estilo de lenguaje, frases ejemplo
- CRUD completo + activar/desactivar (solo una activa por usuario)
- Se inyectan en todos los prompts de generación de contenido

### 3.3 Perfiles de Contenido (`ContentProfile`)
- Configuraciones canal/tipo por usuario
- Campos: nombre, tono, longitud (SHORT/MEDIUM/LONG), audiencia, idioma, hashtags, objetivo de posteo, cuentas sociales vinculadas
- Un perfil puede marcarse como **default**
- CRUD completo — usado por el pipeline editorial

### 3.4 Perfiles de Estilo Visual (`VisualStyleProfile`)
- Configuraciones visuales por usuario/perfil
- Campos: nombre, estilo (MINIMALIST/FUTURISTIC/REALISTIC/etc.), paleta de colores, fuentes, logo URL, proveedor de imágenes preferido, prefijo de prompt personalizado
- CRUD completo — usado en generación de media

---

## 4. TEMAS DE CONTENIDO Y CAMPAÑAS

### 4.1 Temas de Contenido
- Categorías temáticas por workspace
- Campos: nombre, palabras clave, audiencia, prioridad (1-10), formatos preferidos, tipo (TRENDING/EVERGREEN), activo/inactivo
- Acciones: crear, eliminar temas
- Usados por el servicio de estrategia para seleccionar ángulos

### 4.2 Campañas
- Campañas de marketing por workspace con objetivos
- Objetivos: AUTHORITY, TRAFFIC, LEAD_CAPTURE, SALE, COMMUNITY, ENGAGEMENT
- Campos: nombre, oferta, landing URL, fechas inicio/fin, KPI target, canales target, formatos por canal (JSON)
- Vinculación con: perfiles de contenido, personas, temas (relación many-to-many `CampaignTheme`)
- CRUD completo con server actions
- API: listar por workspace, buscar activa, buscar por ID

---

## 5. PIPELINE EDITORIAL (Motor Central)

### 5.1 Editorial Run
- Entidad central que trackea el ciclo completo de creación de contenido
- Flujo de estados: `PENDING → RESEARCH → STRATEGY → CONTENT → MEDIA → COMPLIANCE → REVIEW → APPROVED → PUBLISHING → PUBLISHED`
- También: `REJECTED`, `FAILED`, `POSTPONED`
- Campos: workspace, campaña, fecha, origen (scheduler/manual/campaign/schedule), prioridad, canales target, perfil de contenido, persona IA
- **Crear run** — crea registro y encola primer job
- **Reiniciar run** — limpia registros hijos y re-ejecuta pipeline
- **Aprobar/rechazar/posponer** vía API o Telegram

### 5.2 Orquestador Editorial
- Coordina todas las etapas del pipeline secuencialmente
- Hereda configuración de campaña (canales, perfil, persona) cuando existe
- Fallback: perfil de contenido default + persona activa del owner
- **Procesamiento inline** cuando pgmq no está disponible (ejecuta pipeline sincrónicamente)

### 5.3 Worker Editorial
- Pollea cola `editorial_jobs` cada 10 segundos
- Procesa un job a la vez, acknowledge al completar
- Máximo 3 reintentos antes de marcar como fallido

### 5.4 Scheduler (Cron Jobs)
- **Run diario** a las 7:00 AM (TZ México) — crea runs para todos los workspaces con fuentes activas
- **Detección de runs estancados** cada 6 horas — marca como FAILED tras 2 horas
- **Verificación de schedule** cada 15 minutos — dispara runs según slots definidos por el usuario

---

## 6. MOTOR DE INVESTIGACIÓN

### 6.1 Fuentes de Investigación
- Fuentes RSS/blog/newsletter/social/changelog por workspace
- Campos: nombre, tipo, URL, estado activo, último fetch
- Tipos: RSS, BLOG, NEWSLETTER, SOCIAL, CHANGELOG, CUSTOM

### 6.2 Ejecución de Investigación
- Obtiene feeds RSS en paralelo de todas las fuentes activas
- Filtra artículos a últimas 48 horas, limita a 20 más recientes
- **Extracción con LLM**: puntos clave, ángulos sugeridos, scores de relevancia
- **Campaign-aware**: filtra por keywords del tema de campaña cuando aplica
- Genera **resumen de investigación** con tema dominante, ángulos sugeridos, oportunidades de engagement
- Almacena registros `ResearchSnapshot` por artículo

---

## 7. MOTOR DE ESTRATEGIA

### 7.1 Ejecución de Estrategia
- Lee resumen de investigación + contexto de marca + contexto de campaña
- Selecciona: ángulo óptimo, formato, tono, CTA, seed prompt
- **Evita repetición**: consulta últimos 10 briefs para saltar ángulos recientes
- Respeta configuración `channelFormats` de la campaña
- Inyecta contexto de persona y perfil en el prompt LLM
- Crea `ContentBrief` con: tema, ángulo, formato, CTA, referencias, seed prompt, objetivo, tono

---

## 8. MOTOR DE GENERACIÓN DE CONTENIDO

### 8.1 Generación de Contenido
- Lee ContentBrief y genera copy vía LLM
- **Dos formatos**: copy de post y copy de carousel (slide por slide)
- Produce: hook, copy, caption, título, hashtags, prompts de imagen
- **Dos versiones**: principal (v1) + variante de tono alternativo (v2)
- **Verificación de compliance**: revisión LLM de violaciones a guidelines de marca, niveles de riesgo (low/medium/high)
- Respeta límites de Instagram (2200 chars caption, 30 hashtags max)

### 8.2 Operaciones de Texto
- **Aplicar corrección**: toma feedback humano, regenera vía LLM
- **Cambiar tono**: reescribir con preset diferente (didáctico, técnico, aspiracional, polémico, premium, cercano, mentor, vendedor_suave)

---

## 9. MOTOR DE GENERACIÓN DE MEDIA

### 9.1 Generación de Imágenes
- **Múltiples proveedores**: DALL-E, HuggingFace, Pollinations (gratis), Mock
- Credenciales por usuario en DB con fallback a env vars
- Genera imágenes desde prompts derivados del contenido

### 9.2 Generación de Carousels
- **Compositor SVG** con sistema de templates
- Templates built-in: EDUCATIONAL, NEWS, CTA, AUTHORITY, CONTROVERSIAL
- Slides por template: cover, contenido, CTA con configuración de branding
- Fuentes personalizadas, colores, inyección de logo
- Conversión SVG → base64 para upload a Cloudinary (formato PNG)

### 9.3 Almacenamiento Cloud
- Integración **Cloudinary** para hosting/optimización de imágenes
- Upload, transformación, generación de thumbnails
- Credenciales Cloudinary por usuario (DB o env fallback)
- Mock adapter para desarrollo

### 9.4 Edición de Imagen con IA
- **Endpoint de edición IA**: recibe instrucción de texto y edita asset existente vía modificación de prompt guiada por LLM
- **Regenerar imagen**: regenerar con overrides de prompt personalizados

### 9.5 Pipeline de Media
- Orquesta: generación de prompt → creación de imagen → upload cloud → thumbnail → almacenamiento DB
- Crea registros `MediaAsset` con tracking de estado (PENDING → GENERATING → PROCESSING → READY → FAILED)

---

## 10. MOTOR DE GENERACIÓN DE VIDEO

### 10.1 Generación con Avatar IA
- Integración **HeyGen** para videos con avatar IA
- Síntesis de voz **ElevenLabs** (premium) / **Edge TTS** (fallback gratis)
- Modos: news, educational, CTA, hybrid_motion
- Generación de script desde contenido editorial con salida de subtítulos SRT
- Aspect ratios: 9:16, 16:9, 1:1

### 10.2 Templates de Video
- Templates built-in: NEWS, EDUCATIONAL, CTA, HYBRID_MOTION
- Cada template define estructura de bloques de script y timing

### 10.3 Pipeline de Video
- Crea video job → encola en `video_jobs`
- **Video Worker** pollea cola, verifica estado de render
- Convierte posts/carousels existentes a video bajo demanda
- Preview de script sin renderizar
- Exportar script como formato post

### 10.4 Gestión de Assets de Video
- Listar videos por workspace/estado
- Detalle de video, verificar estado de render
- Listar templates disponibles

---

## 11. MOTOR DE PUBLICACIÓN

### 11.1 Publicación en Redes Sociales
- **Instagram** — posts de imagen, carousels, reels vía Container API (Graph API v21)
- **Facebook** — posts de página con texto + imágenes (Graph API v21)
- **Threads** — publicación a nivel usuario vía Threads API (graph.threads.net v1.0)
- **Discord** — publicación basada en webhooks
- Mock adapter para testing
- Credenciales por workspace desde DB o env vars

### 11.2 Flujo de Publicación
- Encola un registro `Publication` por cada canal target
- **Idempotencia**: verifica publicación exitosa existente antes de crear
- Lógica de reintentos con backoff exponencial (5s base, máx 3 reintentos)
- **Publisher Worker** pollea `publish_jobs` cada 5 segundos
- Tracking de estado: QUEUED → PUBLISHING → PUBLISHED / FAILED / RETRYING / NEEDS_MANUAL_ATTENTION

### 11.3 Gestión de Publicaciones
- Listar publicaciones con filtros (plataforma, estado, editorial run)
- Detalle de publicación con payload enviado y respuesta API
- Reintento manual para publicaciones fallidas
- Publicación manual para runs aprobados
- Cross-post automático a Discord tras publicar en IG/FB/Threads
- Notificaciones Telegram al éxito/fallo

---

## 12. BOT DE TELEGRAM

### 12.1 Revisión de Contenido vía Telegram
- Envía previews editoriales con botones inline:
  - ✅ Aprobar
  - ✏️ Corregir texto (diálogo multi-paso)
  - 🎭 Cambiar tono (selector con 6 presets: didáctico, aspiracional, polémico, premium, cercano, mentor)
  - 🖼️ Regenerar imagen
  - 🎬 Convertir a video
  - ⏰ Posponer
  - ❌ Rechazar
- Soporta **webhook** y **long-polling**
- Previews de carousel enviados como álbum de fotos + texto con botones
- Confirmaciones de publicación con plataforma + permalink

### 12.2 Vinculación de Cuenta Telegram
- Flujo de pairing con QR: generar token → usuario escanea → `/start LINK_<token>`
- Crea `TelegramLink` asociando usuario ↔ chatId
- Verificar estado de pairing, desvincular Telegram
- Mensajes de cada usuario van a su chat específico

### 12.3 Máquina de Estados de Conversación
- Estados en memoria para interacciones multi-paso
- Maneja: input de corrección de texto, callbacks de selección de tono
- Expiración de estados por timeout

---

## 13. ANALYTICS Y SCORING

### 13.1 Colección de Métricas
- Obtiene métricas reales de **Instagram** y **Facebook** Graph API
- Métricas trackeadas: likes, comentarios, shares, saves, reach, impresiones, tasa de engagement
- **Snapshots por ventana de tiempo**: H2, H6, H24, H48, D7 (trackea crecimiento)
- Gated por feature del plan: `analyticsEnabled`

### 13.2 Dashboard de Analytics
- **Resumen**: total publicados, últimos 30 días, últimos 7 días, engagement promedio, top posts
- **Desglose de performance** por: tema, formato, tono
- **Mejores horas** de publicación
- **Curva de crecimiento** por publicación (snapshots de métricas en el tiempo)
- **Resumen semanal** con mejores/peores posts

### 13.3 Servicio de Scoring IA
- **Scoring predictivo**: estima engagement esperado para contenido propuesto
- Análisis de factores: formato, tono, día de semana, multiplicadores de hora
- Score de confianza basado en datos disponibles
- Retorna sugerencias (ej: "cambiar formato", "publicar a diferente hora")

### 13.4 Insights de Performance
- Insights auto-generados en tabla `PerformanceInsight`
- Tipos: BEST_FORMAT, BEST_THEME, BEST_TONE, BEST_HOUR, BEST_CTA, TREND_UP, TREND_DOWN, WEEKLY_SUMMARY, SUGGESTION
- Insights viejos se desactivan al generar nuevos
- Requiere mínimo 5 publicaciones para generar insights

### 13.5 Cron Jobs de Analytics
- **Colección de métricas** cada 6 horas
- **Generación de insights** cada lunes a las 8:00 AM
- **Reporte semanal Telegram** cada lunes a las 9:00 AM — envía resumen con mejores/peores posts, stats de engagement y recomendaciones

---

## 14. PLANES, SUSCRIPCIONES Y FACTURACIÓN

### 14.1 Sistema de Planes
- Tres tiers: FREE, PRO, ENTERPRISE
- Límites: max publicaciones/mes, videos, fuentes, canales, editores, personas, perfiles, storage MB, schedule slots
- Feature flags: analytics, AI scoring, soporte prioritario, branding custom
- Precios mensuales y anuales

### 14.2 Gestión de Suscripciones
- Suscripción por workspace vinculada a plan
- Estados: ACTIVE, TRIALING, PAST_DUE, CANCELED, PAUSED
- Ciclos: MONTHLY, YEARLY
- Soporte de descuento por referido (% almacenado en suscripción)
- Admin puede: activar, extender, cancelar suscripciones

### 14.3 Integración PayPal
- Integración completa con **PayPal Subscription API**
- Flujo de checkout: crear suscripción → redirect a PayPal → aprobación
- Webhooks: BILLING.SUBSCRIPTION.ACTIVATED, CANCELLED, SUSPENDED, PAYMENT.SALE.COMPLETED
- Verificación de firma de webhooks
- Modo sandbox/producción switcheable
- Cancelar suscripción, verificar estado de checkout

### 14.4 Sistema de Licencias
- Llaves generadas por admin (formato: `AUTO-PRO-XXXX-XXXX-XXXX`)
- Generación en lote con metadata: nombre de lote, email/nombre comprador, notas
- **Flujo de redención**: usuario ingresa llave en `/activate` → activa suscripción
- **Time-stacking**: si ya hay suscripción activa, extiende en vez de reemplazar
- Estados: AVAILABLE, ACTIVATED, EXPIRED, REVOKED
- Tracking de máximo de activaciones

### 14.5 Tracking de Uso
- Modelo `UsageRecord` trackea: PUBLICATIONS, VIDEOS, AI_GENERATIONS, API_CALLS por período de facturación
- Verificaciones de límites antes de acciones protegidas
- Decorador `@RequireFeature` para endpoints gated por plan

---

## 15. PANEL DE ADMINISTRACIÓN

### 15.1 Dashboard Admin
- Stats: total workspaces, suscripciones activas, total pagos, suma de ingresos, stats de licencias
- Dashboard mejorado con métricas completas

### 15.2 Gestión de Usuarios
- Listar usuarios con filtros (rol, búsqueda, estado bloqueado)
- Detalle de usuario (workspaces y suscripciones)
- **Bloquear/desbloquear** (revoca todos los refresh tokens)
- **Cambiar rol** (ADMIN, COLLABORATOR, USER)
- **Eliminar usuario** y todos los datos asociados
- Generar códigos de referido
- Generar links de reset de contraseña
- **Cambiar plan** directamente
- Ver actividad del usuario

### 15.3 Gestión de Colaboradores / Afiliados
- **Crear colaboradores** (rol especial para partners afiliados)
- Trackear referidos: qué colaborador refirió a qué usuario
- Tracking de comisiones: 20% sobre suscripciones referidas
- **Aprobar/cancelar referidos**
- **Generar payouts**: crea registros tipo factura para pagos
- Ciclo de payout: DRAFT → CONFIRMED → PAID / VOIDED
- Sistema de numeración de facturas
- Marcar payouts como pagados con método/referencia
- Anular payouts
- Stats de comisiones: globales y por colaborador

### 15.4 Registro de Pagos
- Registro manual con: workspace, monto, moneda, método, referencia, descripción
- Métodos: PayPal, transferencia, MercadoPago, Gumroad, license_key, etc.
- Listado de historial de pagos

### 15.5 Log de Auditoría
- Trail completo de todas las acciones admin
- Campos: acción, categoría, performer, target ID/tipo, detalles JSON, IP
- Categorías: USER_MGMT, COMMISSION, SUBSCRIPTION, LICENSE, SYSTEM
- Búsqueda por categoría, performer, acción, target

---

## 16. GESTIÓN DE MEDIA DEL USUARIO

### 16.1 Sistema de Upload
- **Upload multipart** vía `POST /user-media/file` (límite 50MB)
- También registra URLs directamente (archivos cloud)
- Almacena en disco local con Multer, opcionalmente sube a Cloudinary
- Trackea: filename, URL, thumbnail URL, MIME type, tamaño en bytes
- **Tracking de uso de storage** por workspace (limitado por plan)

### 16.2 Organización de Media
- **Sistema de carpetas**: crear, renombrar, eliminar con subcarpetas anidadas (árbol)
- **Categorías**: LOGO, PRODUCT, BACKGROUND, PERSONAL, OTHER
- **Tags** para metadata de archivos
- Listado paginado con filtros: carpeta, categoría, tag
- Actualizar metadata (tags, categoría, carpeta)
- Eliminar archivos

---

## 17. SCHEDULES DE PUBLICACIÓN

### 17.1 Gestión de Schedules
- Schedules por usuario con soporte de timezone
- Vinculado a perfiles de contenido
- Toggle activo/inactivo
- CRUD completo
- Gated por plan (`scheduleSlots`)

### 17.2 Slots de Schedule
- Pares día de semana + hora (`"HH:MM"`)
- Vinculación a IDs de cuentas sociales
- Ordenamiento por prioridad
- Agregar, actualizar, remover slots individuales
- **Trigger automático**: cron verifica slots cada 15 minutos, crea runs en horarios programados

---

## 18. CREDENCIALES DE USUARIO (API Keys)

### 18.1 Almacenamiento Multi-Proveedor
- **Encriptación AES-256-GCM** para todas las credenciales almacenadas
- Proveedores soportados: LLM (OpenAI/Anthropic), IMAGE_GEN (HuggingFace/DALL-E), RESEARCH (Tavily/SerpAPI), META, DISCORD, CLOUDINARY, GOOGLE_DRIVE, AWS_S3, HEYGEN, TELEGRAM
- CRUD completo: upsert, remover, toggle activo/inactivo
- Display enmascarado de secretos (muestra últimos 4 chars)

### 18.2 Testing de Credenciales
- Tests de conexión por proveedor: LLM, IMAGE_GEN, RESEARCH, CLOUDINARY, META, DISCORD, TELEGRAM, HEYGEN
- Timestamp + resultado del último test guardado para UI

### 18.3 Integración Meta OAuth
- Flujo OAuth completo via popup para conectar Meta (Instagram + Facebook + Threads)
- Scopes: `public_profile`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`, `threads_basic`, `threads_content_publish`
- Intercambio de código por long-lived token (60 días)
- Descubrimiento automático de: Instagram Business Account, Facebook Page, Threads User ID
- Status de conexión: muestra @username de IG, nombre de página FB, @username de Threads
- Desconectar Meta (elimina credencial del workspace)

---

## 19. SERVICIO DE EMAIL

### 19.1 Emails Transaccionales (vía Resend)
- **Verificación de email** (HTML estilizado con botón gradient)
- **Reset de contraseña** (link con 1h de expiración)
- **Reset de contraseña admin** (link con 24h, iniciado por admin)
- **Welcome de suscripción** (confirmación de activación de plan)
- Modo dev: loguea email a consola cuando no hay RESEND_API_KEY

---

## 20. SISTEMA DE COLAS DE JOBS

### 20.1 Queue Service (pgmq)
- Abstracción sobre colas PostgreSQL de Supabase/pgmq
- Colas: `editorial_jobs`, `media_jobs`, `publish_jobs`, `video_jobs`, `analytics_jobs`
- Operaciones: enqueue, dequeue (con visibility timeout), acknowledge
- **Fallback dev**: cola en memoria (array) cuando pgmq no está disponible
- Backoff exponencial para reintentos (5s base × 2^intento)
- Log de jobs en tabla `JobQueueLog`

---

## 21. PAQUETES COMPARTIDOS

### 21.1 `@automatismos/ai`
- **Adaptadores LLM**: OpenAI, Anthropic, Placeholder (dev)
- **Builders de Prompts**: extracción de investigación, resumen, estrategia, copy de post, copy de carousel, variante de tono, corrección, verificación de compliance
- **Utilidades**: fetcher de feeds RSS, parser de respuestas JSON de LLM

### 21.2 `@automatismos/media`
- **Generadores de imagen**: DALL-E, HuggingFace, Pollinations (gratis), Mock
- **Storage cloud**: Cloudinary (upload, transformación, thumbnails)
- **Carousel**: compositor SVG, sistema de templates (5 templates built-in)
- **Video**: HeyGen, Mock video, ElevenLabs voice, Edge TTS (gratis), pipeline de video, templates (4 modos)
- **Media Pipeline**: orquesta flujo completo de generación

### 21.3 `@automatismos/publishers`
- **Adaptadores**: Instagram, Facebook, Threads, Discord, Mock
- **Validadores**: validación de imagen/carousel/video de IG, validación de post FB, builder de captions
- **Métricas**: fetcher de métricas IG/FB vía Graph API

### 21.4 `@automatismos/telegram`
- Definiciones de teclados (7 botones de acción + 6 tonos + cancelar)
- Formatters de mensajes: preview, confirmación de publicación, error
- Mapeo callback-a-acción
- Tipos para updates de Telegram

### 21.5 `@automatismos/shared`
- Constantes: nombres de colas, límites IG/FB, ventanas de publicación, config de reintentos, presets de tono, formatos de contenido
- **Utilidades crypto**: AES-256-GCM encrypt/decrypt, encriptación JSON, enmascaramiento de secretos
- Tipos: DTOs editoriales, tipos de eventos, tipos de preview Telegram

### 21.6 `@automatismos/db`
- Re-export del cliente Prisma
- Schema con **38 modelos** cubriendo todas las entidades
- Scripts de seed, check y auditoría de datos

---

## 22. PÁGINAS DEL DASHBOARD (Frontend)

| Página | Ruta | Función |
|---|---|---|
| Dashboard Home | `/dashboard` | Vista general principal |
| Editorial | `/dashboard/editorial` | Listar runs, crear nuevos runs manuales |
| Detalle Editorial | `/dashboard/editorial/[id]` | Detalle: investigación, brief, versiones, media, aprobaciones |
| Campañas | `/dashboard/campaigns` | CRUD de campañas con temas/canales/formatos |
| Temas | `/dashboard/themes` | Gestión de temas de contenido |
| Fuentes | `/dashboard/sources` | Gestión de fuentes de investigación |
| Publicaciones | `/dashboard/publications` | Lista de contenido publicado |
| Detalle Publicación | `/dashboard/publications/[id]` | Detalle de publicación + métricas |
| Analytics | `/dashboard/analytics` | Dashboard de performance |
| Mejores Horas | `/dashboard/analytics/hours` | Análisis de mejores horas |
| Desglose | `/dashboard/analytics/breakdown` | Desglose por dimensión |
| Videos | `/dashboard/videos` | Gestión de assets de video |
| Detalle Video | `/dashboard/videos/[id]` | Detalle de video |
| Templates Video | `/dashboard/videos/templates` | Browser de templates |
| Media Library | `/dashboard/media` | Assets de media generados por IA |
| Assets Usuario | `/dashboard/assets` | Librería de media subido por usuario |
| Perfiles | `/dashboard/profiles` | Gestión de perfiles de contenido |
| Marca | `/dashboard/brand` | Editor de perfil de marca |
| Credenciales | `/dashboard/credentials` | Gestión de API keys + Meta OAuth |
| Configuración | `/dashboard/settings` | Configuración del workspace |
| Scheduler | `/dashboard/scheduler` | Gestión de horarios de publicación |
| Planes | `/dashboard/plans` | Selección de plan / suscripción |
| Equipo | `/dashboard/team` | Miembros del equipo e invitaciones |
| Admin | `/dashboard/admin` | Dashboard admin + gestión de licencias |
| Admin Usuarios | `/dashboard/admin/users` | Lista de gestión de usuarios |
| Admin Detalle Usuario | `/dashboard/admin/users/[id]` | Administración de usuario individual |
| Admin Comisiones | `/dashboard/admin/commissions` | Gestión de afiliados/comisiones |
| Admin Auditoría | `/dashboard/admin/audit` | Visor de log de auditoría |

---

## 23. INFRAESTRUCTURA Y DEVOPS

### 23.1 Docker
- `docker-compose.yml` para despliegue full stack
- `Dockerfile` para API y Web
- `api-entrypoint.sh` para startup de container

### 23.2 Supabase
- PostgreSQL vía Supabase
- Migraciones: creación de colas, setup de storage buckets
- Integración pgmq para colas de jobs

### 23.3 Health Check
- `GET /api/health` — endpoint público: status, timestamp, conexión DB, versión

---

## 📊 Resumen en Números

| Categoría | Cantidad |
|---|---|
| **Modelos Prisma** | 38 |
| **Controllers API** | 25 |
| **Servicios Backend** | 36 |
| **Páginas Dashboard** | 29 |
| **Server Actions** | 15 |
| **Auth Guards** | 4 |
| **Colas de Jobs** | 5 |
| **Cron Jobs** | 5 |
| **Plataformas Sociales** | 4 (Instagram, Facebook, Threads, Discord) |
| **Proveedores de Imagen** | 4 (DALL-E, HuggingFace, Pollinations, Mock) |
| **Proveedores de Video** | 2 (HeyGen, Mock) |
| **Proveedores de Voz** | 3 (ElevenLabs, Edge TTS, Mock) |
| **Proveedores de Credenciales** | 10 |
| **Formatos de Contenido** | 6 (post, carousel, reel, story, avatar_video, hybrid_motion) |
| **Presets de Tono** | 8 |
| **Cron Schedules** | 5 (daily run, stale detection, publish schedule, metrics, insights) |
