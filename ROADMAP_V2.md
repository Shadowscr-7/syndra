# Syndra v2 — Roadmap de Evolución

> **Objetivo**: Transformar Syndra de una herramienta single-tenant en una plataforma SaaS multi-usuario lista para vender a creadores de contenido, streamers e influencers.

---

## Resumen de Fases

| Fase | Nombre | Dependencias | Estimación |
|------|--------|-------------|------------|
| 1 | Auth, Registro y Roles | — | Fundación |
| 2 | Planes y Facturación | Fase 1 | Monetización |
| 3 | Programa de Afiliados | Fase 1 + 2 | Crecimiento |
| 4 | Panel de Administración | Fase 1 | Operaciones |
| 5 | Configuración Personal (Keys, Redes, Storage) | Fase 1 | Core UX |
| 6 | Perfiles de Contenido y AI Persona | Fase 1 + 5 | Personalización |
| 7 | Repositorio de Imágenes y Scheduler | Fase 1 + 5 | Automatización |
| 8 | Telegram Multi-usuario (QR Pairing) | Fase 1 + 5 | Notificaciones |

---

## Fase 1 — Auth, Registro y Roles

> **Prioridad**: CRÍTICA — Todo depende de esto.

### 1.1 Registro de usuarios

- Formulario de registro: nombre, email, contraseña
- Validación de email (envío de verificación)
- Hash de contraseña con bcrypt/argon2
- Al registrarse eligen uno de los 3 planes (Starter, Creator, Pro)
- Campo opcional de **código de referido** en el formulario de registro

### 1.2 Login y sesión

- Login con email + contraseña
- JWT con access token (15 min) + refresh token (7 días)
- Middleware de autenticación en todas las rutas protegidas
- Logout con invalidación de refresh token

### 1.3 Roles de usuario

| Rol | Descripción | Quién lo asigna |
|-----|-------------|-----------------|
| `ADMIN` | Control total de la plataforma. Ve todos los usuarios, gestiona colaboradores, configura ajustes globales | Seed / manual |
| `COLLABORATOR` | Afiliado/influencer que promueve Syndra. Tiene cupón auto-generado, ve su panel de comisiones | El ADMIN lo da de alta |
| `USER` | Usuario final que crea contenido con Syndra | Auto-registro |

### 1.4 Modelo de datos

```
User {
  id
  email (unique)
  passwordHash
  name
  avatarUrl?
  role: ADMIN | COLLABORATOR | USER
  planId → Plan
  subscriptionStatus: ACTIVE | TRIAL | EXPIRED | CANCELLED
  isBlocked: boolean
  emailVerified: boolean
  referredByCode?: string  // código del afiliado que lo refirió
  createdAt
  updatedAt
}
```

### 1.5 Migración desde estado actual

- El usuario actual (`usr_migrate_001` / `admin@syndra.dev`) se convierte en ADMIN
- Los workspaces existentes se asocian al usuario admin
- Se mantiene compatibilidad con el flujo actual durante la migración

---

## Fase 2 — Planes y Facturación

> **Prioridad**: ALTA — Sin esto no hay monetización.

### 2.1 Definición de planes

| | Starter | Creator | Pro |
|---|---------|---------|-----|
| **Precio mensual** | $15 USD | $29 USD | $79 USD |
| **Precio anual** | $144 USD ($12/mes, -20%) | $278 USD ($23.2/mes, -20%) | $758 USD ($63.2/mes, -20%) |
| **Posts/mes** | 30 | 120 | Ilimitado |
| **Redes sociales** | 1 | 3 | Múltiples (ilimitadas) |
| **Generación IA imágenes** | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | Básico | Completo |
| **Perfiles de contenido** | 1 | 3 | Ilimitados |
| **Repositorio de imágenes** | 100 MB | 1 GB | 10 GB |
| **Scheduler** | ❌ | ✅ (horarios básicos) | ✅ (avanzado + colas) |
| **AI Persona Builder** | ❌ | ✅ (1 persona) | ✅ (ilimitadas) |
| **Cuentas múltiples** | ❌ | ❌ | ✅ |

### 2.2 Modelo de datos

```
Plan {
  id
  name: STARTER | CREATOR | PRO
  displayName
  priceMonthly: number    // centavos (1500 = $15)
  priceYearly: number     // centavos (14400 = $144)
  maxPostsPerMonth: number | null  // null = ilimitado
  maxSocialAccounts: number | null
  maxContentProfiles: number | null
  maxStorageMb: number
  features: string[]      // ["ai_images", "analytics_basic", "scheduler", ...]
  isActive: boolean
  createdAt
}

Subscription {
  id
  userId → User
  planId → Plan
  billingCycle: MONTHLY | YEARLY
  status: ACTIVE | TRIAL | PAST_DUE | CANCELLED | EXPIRED
  stripeCustomerId?
  stripeSubscriptionId?
  currentPeriodStart
  currentPeriodEnd
  couponCode?: string      // cupón aplicado
  discountPercent?: number  // descuento total aplicado
  createdAt
  updatedAt
}
```

### 2.3 Enforcement de límites

- Middleware que valida en cada acción:
  - `canCreatePost(userId)` → verifica posts del mes vs límite del plan
  - `canConnectSocial(userId)` → verifica cuentas conectadas vs límite
  - `canUseFeature(userId, feature)` → verifica si el plan incluye la feature
- Respuestas 403 con mensaje claro: "Tu plan Starter permite 30 posts/mes. Upgrade a Creator para más."
- En el frontend: features bloqueadas muestran overlay con CTA de upgrade

### 2.4 Integración de pagos (Stripe)

- Stripe Checkout para suscripciones
- Webhooks de Stripe: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Portal de cliente de Stripe para gestionar tarjeta y cancelar
- Aplicación de cupones de descuento en checkout

### 2.5 Descuentos

| Tipo | Descuento | Acumulable |
|------|-----------|------------|
| Plan anual | 20% sobre mensual | — |
| Cupón de afiliado | 20% adicional | ✅ con anual |

Ejemplo: Pro anual + cupón = $79 × 12 = $948 → -20% anual = $758.40 → -20% cupón = **$606.72/año** ($50.56/mes)

---

## Fase 3 — Programa de Afiliados

> **Prioridad**: ALTA — Motor de adquisición de usuarios.

### 3.1 Alta de colaboradores

- Solo el ADMIN puede dar de alta colaboradores
- Al crear un colaborador:
  1. Se crea el User con role `COLLABORATOR`
  2. Se genera automáticamente un cupón basado en su nombre + descuento
     - Algoritmo: `NOMBRE_UPPER` + `20` → ej: nombre "Agustín" → `AGUS20`, "Juan Pablo" → `JUANP20`
     - Si ya existe, agregar número: `AGUS20_2`
  3. Se envía email al colaborador con su cupón y link de panel

### 3.2 Modelo de datos

```
AffiliateCode {
  id
  collaboratorId → User (role=COLLABORATOR)
  code: string (unique)     // "AGUS20"
  discountPercent: number    // 20
  commissionPercent: number  // 20 (% de lo que pagó el cliente)
  isActive: boolean
  createdAt
}

AffiliateReferral {
  id
  affiliateCodeId → AffiliateCode
  referredUserId → User       // el cliente que usó el código
  subscriptionId → Subscription
  amountPaid: number           // lo que pagó el cliente (en centavos)
  commissionAmount: number     // comisión calculada (20% de amountPaid)
  status: PENDING | APPROVED | PAID | CANCELLED
  paidAt?: DateTime
  payoutBatchId?: string       // agrupador para recibos
  createdAt
}
```

### 3.3 Flujo de comisiones

1. Cliente se registra con código `AGUS20`
2. Se aplica 20% de descuento en su primera suscripción
3. Se crea registro `AffiliateReferral` con status `PENDING`
4. Admin revisa y aprueba → status `APPROVED`
5. Admin genera recibo/payout → status `PAID`
6. **Comisión = única vez por cliente** (solo la primera compra)

### 3.4 Panel del colaborador

- Ve su código y link para compartir: `https://app.syndra.dev/register?ref=AGUS20`
- Lista de referidos con:
  - Cliente (nombre, fecha de registro)
  - Plan elegido
  - Monto pagado
  - Comisión generada
  - Estado (Pendiente / Aprobado / Pagado)
- Totales: comisiones pendientes, aprobadas, pagadas

### 3.5 Panel admin — Payouts

- Ve todas las comisiones pendientes/aprobadas
- Puede generar "batch de pago" que incluye solo las comisiones `APPROVED` no pagadas
- El batch genera un resumen/recibo con:
  - Colaborador
  - Lista de referidos incluidos
  - Total a pagar
- Al confirmar pago, todas pasan a `PAID` con fecha y batch ID

---

## Fase 4 — Panel de Administración

> **Prioridad**: ALTA — Necesario para operar la plataforma.

### 4.1 Dashboard admin

- Métricas globales:
  - Total usuarios activos
  - Distribución por plan
  - Ingresos del mes (MRR)
  - Posts generados (total plataforma)
  - Tasa de conversión trial → pago

### 4.2 Gestión de usuarios

- Lista paginada con búsqueda y filtros:
  - Por rol (admin, collaborator, user)
  - Por plan
  - Por estado (activo, bloqueado, expirado)
  - Por fecha de registro
- Acciones por usuario:
  - **Bloquear / Desbloquear**: toggle `isBlocked`, usuario pierde acceso inmediato
  - **Generar link de reset de contraseña**: genera un token temporal (24h) y URL que se puede enviar al usuario
  - **Cambiar plan manualmente** (override)
  - **Ver actividad**: últimos runs, publicaciones, login

### 4.3 Gestión de colaboradores

- Alta de nuevo colaborador (genera usuario + cupón automáticamente)
- Lista de colaboradores con sus cupones y estadísticas
- Activar/desactivar cupones
- Panel de payouts (ver Fase 3.5)

### 4.4 Moderación / Auditoría

- Log de acciones admin (quién hizo qué y cuándo)
- Alertas de uso anómalo (ej: usuario generando 500 posts con plan Starter)

---

## Fase 5 — Configuración Personal (Keys, Redes, Storage)

> **Prioridad**: ALTA — Cada usuario tiene su propia configuración.

### 5.1 API Keys por usuario

Cada usuario configura sus propias credenciales:

| Servicio | Keys requeridas | Plan mínimo |
|----------|----------------|-------------|
| LLM (OpenRouter / OpenAI) | API Key | Starter |
| Generación de imágenes (HuggingFace) | API Token | Creator |
| Búsqueda de fuentes (Tavily / SerpAPI) | API Key | Starter |

- Panel de configuración: formulario por servicio
- Keys se guardan **encriptadas** en BD (AES-256-GCM)
- El usuario puede ver que tiene una key configurada pero no su valor completo (últimos 4 chars)
- Botón de "Probar conexión" por cada servicio

### 5.2 Cuentas de redes sociales

- OAuth flow por usuario para:
  - **Instagram** (vía Meta Graph API)
  - **Facebook** (Pages)
  - **Discord** (Webhook URL)
  - **Twitter/X** (futuro)
  - **TikTok** (futuro)
  - **LinkedIn** (futuro)
- Cada cuenta conectada se asocia al usuario y a un perfil de contenido
- Respeta límite del plan: Starter = 1 red, Creator = 3, Pro = ilimitadas
- Panel muestra cuentas conectadas con estado (activa, token expirado, desconectada)

### 5.3 Proveedor de almacenamiento de imágenes

Cada usuario elige dónde guardar sus imágenes generadas:

| Proveedor | Configuración | Notas |
|-----------|---------------|-------|
| **Cloudinary** (default) | Cloud Name, API Key, API Secret | Ya integrado |
| **Google Drive** | OAuth + folder ID | Imágenes en carpeta del usuario |
| **AWS S3** | Bucket, Access Key, Secret | Para usuarios técnicos |
| **Almacenamiento Syndra** | — (incluido) | Storage compartido con límite según plan |

- Si el usuario no configura nada → usa almacenamiento Syndra (con límite de plan)
- Panel de configuración con test de conexión

### 5.4 Modelo de datos

```
UserCredential {
  id
  userId → User
  provider: LLM | IMAGE_GEN | RESEARCH | META | DISCORD | CLOUDINARY | GOOGLE_DRIVE | AWS_S3
  encryptedPayload: string  // JSON encriptado con AES-256-GCM
  label?: string            // nombre descriptivo dado por el usuario
  isActive: boolean
  lastTestedAt?: DateTime
  lastTestResult?: string
  createdAt
  updatedAt
}
```

---

## Fase 6 — Perfiles de Contenido y AI Persona

> **Prioridad**: MEDIA — Diferenciador clave del producto.

### 6.1 AI Persona Builder (nivel usuario)

Definición **global** del usuario que aplica a todo su contenido:

```
UserPersona {
  id
  userId → User
  brandName: string          // "Mi marca tech"
  brandDescription: string   // descripción libre
  tone: string[]             // ["sarcástico", "experto", "directo"]
  expertise: string[]        // ["IA", "programación", "startups"]
  visualStyle: string        // "minimalista"
  targetAudience: string     // "desarrolladores y emprendedores tech"
  avoidTopics: string[]      // ["política", "religión"]
  languageStyle: string      // "tuteo, informal, con humor"
  examplePhrases: string[]   // frases que la IA puede imitar
  isActive: boolean
  createdAt
}
```

- La IA recibe la persona como **system prompt** en cada generación
- El usuario puede tener múltiples personas (Pro) y activar una a la vez
- Starter: ❌ no disponible (usa prompt genérico)
- Creator: 1 persona
- Pro: ilimitadas

### 6.2 Perfiles de contenido (múltiples por usuario)

Cada perfil define un "canal" o "tipo de contenido":

```
ContentProfile {
  id
  userId → User
  name: string               // "Canal educativo IA"
  tone: EDUCATIONAL | TECHNICAL | ASPIRATIONAL | CONTROVERSIAL | CASUAL | PREMIUM
  contentLength: SHORT | MEDIUM | LONG
  audience: string            // "emprendedores de 25-40 años"
  language: string            // "es-MX"
  hashtags: string[]          // hashtags predeterminados
  postingGoal: string         // "educar sobre IA aplicada"
  linkedSocialAccounts: string[]  // IDs de cuentas conectadas
  isDefault: boolean
  createdAt
}
```

- Starter: 1 perfil
- Creator: 3 perfiles
- Pro: ilimitados
- Cada run editorial se ejecuta con un perfil seleccionado

### 6.3 Perfiles de estilo visual

Configuración de cómo se generan las imágenes:

```
VisualStyleProfile {
  id
  userId → User
  contentProfileId? → ContentProfile  // opcional: asociar a un perfil de contenido
  name: string                // "Futurista tech"
  style: MINIMALIST | FUTURISTIC | REALISTIC | CARTOON | ABSTRACT | PHOTOGRAPHY | NEON | VINTAGE
  colorPalette: string[]      // ["#1a1a2e", "#e94560", "#0f3460"]
  primaryFont?: string
  secondaryFont?: string
  logoUrl?: string
  preferredImageProvider: string  // "huggingface" | "dall-e" | "midjourney"
  customPromptPrefix?: string    // "Always include gradient backgrounds..."
  createdAt
}
```

- Se inyecta en el prompt de generación de imágenes
- Afecta tanto a imágenes individuales como a slides de carrusel

---

## Fase 7 — Repositorio de Imágenes y Scheduler

> **Prioridad**: MEDIA — Features de valor agregado.

### 7.1 Repositorio de imágenes

Cada usuario puede subir y organizar imágenes propias:

```
UserMedia {
  id
  userId → User
  folderId? → MediaFolder
  filename: string
  url: string
  thumbnailUrl: string
  mimeType: string
  sizeBytes: number
  tags: string[]             // ["logo", "producto", "fondo"]
  category: LOGO | PRODUCT | BACKGROUND | PERSONAL | OTHER
  metadata: json             // dimensiones, etc.
  createdAt
}

MediaFolder {
  id
  userId → User
  name: string              // "Logos", "Productos", "Fondos"
  parentId? → MediaFolder   // subcarpetas
  createdAt
}
```

- Upload vía drag & drop en el panel
- Organización en carpetas
- Tags para búsqueda rápida
- La IA puede **combinar** imágenes del repositorio con generadas:
  - "Usa mi logo como watermark"
  - "Pon mi producto sobre fondo generado por IA"
  - "Usa esta foto personal como base"
- Límite según plan: Starter 100MB, Creator 1GB, Pro 10GB

### 7.2 Scheduler

El usuario define sus horarios de publicación:

```
PublishSchedule {
  id
  userId → User
  contentProfileId? → ContentProfile
  timezone: string           // "America/Mexico_City"
  slots: ScheduleSlot[]
  isActive: boolean
  createdAt
}

ScheduleSlot {
  id
  scheduleId → PublishSchedule
  dayOfWeek: MONDAY | TUESDAY | ... | SUNDAY
  time: string              // "09:00"
  socialAccountIds: string[] // a qué cuentas publicar
  priority: number          // orden si hay múltiples en el mismo horario
}
```

**Comportamiento:**

1. El usuario configura slots:
   - Lunes 9:00 → Instagram
   - Miércoles 15:00 → Instagram + Facebook
   - Viernes 20:00 → Instagram + Discord
2. El cron del sistema:
   - Revisa slots que se acercan (30 min antes)
   - Si hay contenido aprobado en cola → asigna `publishWindow`
   - Si no hay contenido → genera un nuevo editorial run automáticamente
3. El scheduler respeta el plan:
   - Starter: ❌ no disponible (publicación manual)
   - Creator: slots básicos (máx 7/semana)
   - Pro: ilimitados + auto-generación

---

## Fase 8 — Telegram Multi-usuario (QR Pairing)

> **Prioridad**: MEDIA — Mejora operativa para aprobaciones.

### 8.1 Concepto

- Syndra usa **un solo bot** (`@Syndra_bot`) para todos los usuarios
- Cada usuario vincula su Telegram al bot escaneando un QR o usando un deep link
- El bot sabe a quién enviar cada preview basándose en el `chatId` vinculado

### 8.2 Flujo de vinculación

1. Usuario va a Configuración → Telegram
2. Se genera un **token temporal** (6 caracteres, 5 min de vida)
3. Se muestra:
   - QR code con link: `https://t.me/Syndra_bot?start=LINK_abc123`
   - O texto: "Envía `/start LINK_abc123` al bot @Syndra_bot"
4. El bot recibe el `/start` con el token
5. Backend asocia el `chatId` del mensaje de Telegram con el `userId`
6. Confirmación en ambos lados (web + Telegram)

### 8.3 Modelo de datos

```
TelegramLink {
  id
  userId → User
  chatId: string
  username?: string
  firstName?: string
  isActive: boolean
  linkedAt: DateTime
}

TelegramLinkToken {
  id
  userId → User
  token: string (unique)
  expiresAt: DateTime
  usedAt?: DateTime
}
```

### 8.4 Routing de mensajes

- Cada preview se envía al `chatId` del usuario dueño del editorial run
- El polling/webhook del bot recibe callbacks y los routea al usuario correcto
- Admin puede recibir notificaciones de todos los usuarios (configurable)

---

## Orden de implementación recomendado

```
Fase 1: Auth, Registro y Roles ──────────────────────────┐
    │                                                      │
    ├── Fase 4: Panel de Administración                    │
    │                                                      │
    ├── Fase 2: Planes y Facturación ─────┐                │
    │       │                              │                │
    │       └── Fase 3: Programa Afiliados │                │
    │                                      │                │
    ├── Fase 5: Config Personal ───────────┤                │
    │       │                              │                │
    │       ├── Fase 6: Perfiles + Persona │                │
    │       │                              │                │
    │       ├── Fase 7: Imágenes + Sched.  │                │
    │       │                              │                │
    │       └── Fase 8: Telegram Multi     │                │
    │                                      │                │
    └──────────────────────────────────────┘                │
                                                            │
```

### Ruta crítica (MVP de venta):
1. **Fase 1** → Auth y roles
2. **Fase 2** → Planes con Stripe
3. **Fase 5** → Config personal (keys y redes por usuario)
4. **Fase 4** → Admin panel
5. **Fase 3** → Afiliados
6. **Fase 6** → Personalización
7. **Fase 7** → Scheduler + imágenes
8. **Fase 8** → Telegram multi-usuario

---

## Stack técnico para las nuevas fases

| Componente | Tecnología |
|-----------|-----------|
| Auth | JWT + bcrypt + refresh tokens (NestJS Guards) |
| Payments | Stripe Checkout + Billing Portal + Webhooks |
| Encriptación de keys | AES-256-GCM (node:crypto) |
| QR codes | `qrcode` npm package |
| File upload | Multer + Cloudinary/S3 |
| Scheduler cron | `@nestjs/schedule` (ya en uso) |
| Email | Resend / SendGrid (verificación, reset, notificaciones) |
| Rate limiting | `@nestjs/throttler` por plan |

---

*Documento generado: 7 de marzo de 2026*
*Branch: `dev`*
*Siguiente paso: confirmar prioridades y arrancar Fase 1*
