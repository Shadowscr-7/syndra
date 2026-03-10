# MEJORAS 3 — Transformación: De Plataforma de Tendencias a Motor de Promoción de Negocios

> **Objetivo**: Que Syndra sirva para publicitar un negocio real — generar imágenes con logos y productos del usuario, crear posts de ofertas, promociones, catálogo de productos — no solo contenido basado en noticias/tendencias externas.

---

## Diagnóstico: Roles de IA Hardcodeados

### ❌ PROBLEMA CRÍTICO: Roles de prompt estáticos

Los prompts de IA tienen **roles hardcodeados como strings literales** que asumen que el usuario es una marca de tecnología. Esto es un error de diseño — el rol debería ser dinámico según la industria/negocio configurado por el usuario.

**Todos los hardcodes encontrados:**

| Archivo | Línea | Texto hardcodeado | Debería ser |
|---------|-------|-------------------|-------------|
| `packages/ai/src/prompts/content.prompts.ts` | L68 | `"Eres un copywriter experto en redes sociales tech/IA."` | Rol dinámico según `workspace.industry` + `persona.expertise` |
| `packages/ai/src/prompts/content.prompts.ts` | L116 | `"Eres un copywriter experto en carousels educativos de Instagram sobre tech/IA."` | Igual, dinámico |
| `packages/ai/src/prompts/research.prompts.ts` | L68 | `"Eres un analista de tendencias en tecnología e inteligencia artificial."` | `"Eres un analista de tendencias en ${industry}."` |
| `packages/ai/src/prompts/research.prompts.ts` | L69 | `"...crear contenido en redes sociales (Instagram/Facebook) sobre IA y automatización."` | `"...sobre ${workspace.description || industry}."` |
| `packages/ai/src/prompts/strategy.prompts.ts` | L122 | `"Eres un estratega de contenido para redes sociales especializado en tech/IA."` | `"Eres un estratega de contenido para redes sociales especializado en ${industry}."` |
| `packages/ai/src/prompts/trend.prompts.ts` | L46 | `'tecnología, IA, innovación'` (fallback de keywords) | `workspace.industry` o vacío |
| `apps/api/src/strategy/strategy.service.ts` | L246 | `'AI trends'` (fallback de seedPrompt) | `'contenido de ${workspace.industry || "la marca"}'` |
| `apps/api/src/strategy/strategy.service.ts` | L251 | `['#AI', '#tech', '#automation']` (fallback hashtags) | Hashtags del brandProfile o contentProfile |
| `packages/ai/src/prompts/research.prompts.ts` | L113 (resumen) | `"Eres el estratega editorial de una marca de tecnología e IA."` | `"Eres el estratega editorial de ${persona.brandName || 'una marca de ' + industry}."` |

### ✅ Solución: Parámetro `industryContext` en todos los prompts

- [x] **1.1** Agregar campo `industryContext` (o `roleContext`) a la interfaz de params de cada prompt builder ✅
- [x] **1.2** `buildPostCopyPrompt`: Cambiar rol hardcodeado → dinámico con `industryContext` ✅
- [x] **1.3** `buildCarouselCopyPrompt`: Mismo cambio → rol dinámico con `industryContext` ✅
- [x] **1.4** `buildResearchExtractionPrompt`: Param `industry` → rol dinámico ✅
- [x] **1.5** `buildResearchSummaryPrompt`: Param `industry` → rol dinámico ✅
- [x] **1.6** `buildStrategyPrompt`: Param `industryContext` → rol dinámico ✅
- [x] **1.7** `buildTrendDetectionPrompt`: Fallback dinámico con `workspace.industry` ✅
- [x] **1.8** `strategy.service.ts` fallback: Usa tema activo / `workspace.industry` + hashtags del brandProfile ✅
- [x] **1.9** Todos los servicios pasan `workspace.industry` / `persona.expertise` como contexto ✅

---

## 2. SCHEMA: Nuevos tipos de temas y fuentes

### 2.1 Ampliar `ThemeType` enum

**Actual:**
```prisma
enum ThemeType {
  TRENDING
  EVERGREEN
}
```

**Nuevo:**
- [x] Agregar `PRODUCT` — contenido sobre un producto específico ✅
- [x] Agregar `SERVICE` — contenido sobre un servicio ✅
- [x] Agregar `OFFER` — promoción, descuento, oferta limitada ✅
- [x] Agregar `SEASONAL` — contenido de temporada (Navidad, Black Friday, etc.) ✅
- [x] Agregar `TESTIMONIAL` — casos de éxito, reseñas de clientes ✅
- [x] Agregar `BEHIND_SCENES` — detrás de escena del negocio ✅
- [x] Agregar `EDUCATIONAL` — contenido educativo sobre el sector (sin depender de noticias) ✅
- [x] Agregar `ANNOUNCEMENT` — lanzamientos, novedades del negocio ✅

```prisma
enum ThemeType {
  TRENDING        // Basado en tendencias externas (RSS)
  EVERGREEN       // Contenido atemporal
  PRODUCT         // Promoción de producto específico
  SERVICE         // Promoción de servicio
  OFFER           // Ofertas, descuentos, flash sales
  SEASONAL        // Contenido de temporada
  TESTIMONIAL     // Casos éxito / testimonios
  BEHIND_SCENES   // Detrás de escena
  EDUCATIONAL     // Educativo sobre el sector
  ANNOUNCEMENT    // Lanzamientos y novedades del negocio
}
```

### 2.2 Agregar campos de producto a `ContentTheme`

- [x] Agregar campo `productName String?` — nombre del producto/servicio asociado ✅
- [x] Agregar campo `productDescription String?` — descripción corta ✅
- [x] Agregar campo `productPrice String?` — precio o rango (ej: "$29.99", "Desde $15") ✅
- [x] Agregar campo `productUrl String?` — URL de landing/compra ✅
- [x] Agregar campo `productMediaIds String[]` — IDs de UserMedia asociados (logos, fotos de producto) ✅
- [x] Agregar campo `promotionStart DateTime?` — inicio de promoción ✅
- [x] Agregar campo `promotionEnd DateTime?` — fin de promoción ✅
- [x] Agregar campo `discountText String?` — texto de descuento (ej: "20% OFF", "2x1") ✅

### 2.3 Ampliar `SourceType` enum

**Actual:**
```prisma
enum SourceType {
  RSS
  BLOG
  NEWSLETTER
  SOCIAL
  CHANGELOG
  CUSTOM
}
```

**Nuevo:**
- [x] Agregar `PRODUCT_CATALOG` — catálogo de productos interno ✅
- [x] Agregar `BUSINESS_BRIEF` — brief manual del negocio ✅
- [x] Agregar `OFFER_CALENDAR` — calendario de ofertas/promociones ✅
- [x] Agregar `FAQ` — preguntas frecuentes del negocio ✅
- [x] Agregar `TESTIMONIALS_SOURCE` — banco de testimonios de clientes ✅

### 2.4 Ampliar `MediaCategory` enum

**Actual:**
```prisma
enum MediaCategory {
  LOGO
  PRODUCT
  BACKGROUND
  PERSONAL
  OTHER
}
```

**Nuevo:**
- [x] Agregar `PROMOTION` — banners de ofertas/descuentos ✅
- [x] Agregar `BANNER` — banners genéricos de marca ✅
- [x] Agregar `OFFER_IMAGE` — imágenes específicas de ofertas ✅
- [x] Agregar `BRAND_ELEMENT` — iconos, paleta, elementos visuales de marca ✅

### 2.5 Agregar metadata de producto a `UserMedia`

- [x] Agregar campo `productName String?` — "Zapatillas Air Max 90" ✅
- [x] Agregar campo `productSku String?` — "SKU-12345" ✅
- [x] Agregar campo `productPrice String?` — "$89.99" ✅
- [x] Agregar campo `productUrl String?` — "https://tienda.com/air-max-90" ✅
- [x] Agregar campo `productDescription String?` — descripción corta del producto ✅
- [x] Agregar campo `useInPipeline Boolean @default(false)` — marcar como "usar en generación automática" ✅
- [x] Agregar campo `isLogo Boolean @default(false)` — marcar como logo principal ✅

### 2.6 Ampliar `CampaignObjective` enum

**Actual:**
```prisma
enum CampaignObjective {
  AUTHORITY
  TRAFFIC
  LEAD_CAPTURE
  SALE
  COMMUNITY
  ENGAGEMENT
}
```

**Nuevo:**
- [x] Agregar `PROMOTION` — campaña de promoción/descuento específico ✅
- [x] Agregar `PRODUCT_LAUNCH` — lanzamiento de producto nuevo ✅
- [x] Agregar `SEASONAL_SALE` — venta de temporada ✅
- [x] Agregar `BRAND_AWARENESS` — dar a conocer la marca ✅
- [x] Agregar `CATALOG` — mostrar catálogo de productos ✅

---

## 3. BACKEND: Research Interno (sin RSS)

### 3.1 Modelo `BusinessBrief` — Datos internos del negocio

- [x] Crear modelo en Prisma: ✅
```prisma
model BusinessBrief {
  id            String   @id @default(cuid())
  workspaceId   String   @map("workspace_id")
  type          BriefType
  title         String                   // "Oferta del mes: 30% en zapatillas"
  content       String                   // Descripción detallada
  productName   String?  @map("product_name")
  productPrice  String?  @map("product_price")
  productUrl    String?  @map("product_url")
  discountText  String?  @map("discount_text")
  validFrom     DateTime? @map("valid_from")
  validUntil    DateTime? @map("valid_until")
  mediaIds      String[] @default([]) @map("media_ids") // UserMedia IDs
  isActive      Boolean  @default(true) @map("is_active")
  priority      Int      @default(5)     // 1-10
  usageCount    Int      @default(0) @map("usage_count")  // Cuántas veces se ha usado
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, isActive])
  @@map("business_briefs")
}

enum BriefType {
  PRODUCT          // Información de producto
  SERVICE          // Información de servicio
  OFFER            // Oferta/descuento activo
  ANNOUNCEMENT     // Novedad del negocio
  TESTIMONIAL      // Testimonio de cliente
  FAQ              // Pregunta frecuente
  SEASONAL         // Contenido de temporada
  BRAND_STORY      // Historia de la marca
}
```

### 3.2 CRUD de BusinessBrief

- [x] Crear `apps/api/src/business-briefs/business-briefs.service.ts` ✅
- [x] Crear `apps/api/src/business-briefs/business-briefs.controller.ts` ✅
- [x] Crear `apps/api/src/business-briefs/business-briefs.module.ts` ✅
- [x] Endpoints: ✅
  - `GET /api/business-briefs` — listar briefs del workspace
  - `POST /api/business-briefs` — crear brief
  - `PATCH /api/business-briefs/:id` — editar brief
  - `DELETE /api/business-briefs/:id` — eliminar brief
  - `PATCH /api/business-briefs/:id/toggle` — activar/desactivar

### 3.3 Modificar Research Service: Path alternativo sin RSS

**Actual:** `research.service.ts` → SIEMPRE busca RSS → extrae artículos → genera resumen

**Nuevo:** El research debe detectar el tipo de contenido y actuar:

- [x] **3.3.1** ✅ Agregar lógica: Si `theme.type` es `PRODUCT | SERVICE | OFFER | TESTIMONIAL | ANNOUNCEMENT | SEASONAL | BEHIND_SCENES | EDUCATIONAL`:
  - ✅ **NO buscar RSS** — usar datos del `BusinessBrief` y/o del `ContentTheme` directamente
  - ✅ Buscar briefs activos del workspace que matcheen con el `theme.type`
  - ✅ Construir `researchSummary` desde datos internos, no desde artículos externos
  - ✅ Los `ResearchSnapshot` se crean desde los briefs (en vez de desde artículos RSS)

- [x] **3.3.2** Si `theme.type` es `TRENDING` o `EVERGREEN`: ✅ *(flujo RSS actual no se modificó)*
  - Flujo actual (RSS) se mantiene sin cambios

- [x] **3.3.3** ✅ Nuevo método `executeInternalResearch(editorialRunId, workspaceId, themeType)`:
  - ✅ Carga BusinessBriefs activos filtrados por `themeType` ↔ `BriefType`
  - ✅ Carga UserMedia marcados con `useInPipeline = true`
  - ✅ Genera `ResearchSnapshot` con: `title` = brief.title, `keyPoints` = [brief.content, brief.productName, brief.discountText], `suggestedAngle` = ángulo basado en el tipo
  - ✅ Genera `researchSummary` usando un **nuevo prompt** que entiende datos de negocio (no artículos)

### 3.4 Nuevo prompt: `buildBusinessResearchPrompt`

- [x] Crear en `packages/ai/src/prompts/business.prompts.ts`: ✅ *(creado con buildBusinessResearchPrompt, buildPromotionalCopyPrompt, buildVisualCompositionPrompt)*

```typescript
export function buildBusinessResearchPrompt(params: {
  briefs: Array<{
    type: string;
    title: string;
    content: string;
    productName?: string;
    productPrice?: string;
    discountText?: string;
    validUntil?: string;
  }>;
  brandContext: { voice: string; tone: string; keywords: string[] };
  industry: string;
  persona?: { brandName: string; expertise: string[]; targetAudience: string };
}): string
```

- El prompt dice: "Eres el estratega de contenido de {brandName}, una marca de {industry}. Analiza estos datos internos del negocio y genera ángulos de contenido promocional..."
- No busca "tendencias" sino oportunidades de promoción, ángulos de venta, storytelling de producto

---

## 4. BACKEND: Strategy sin dependencia de RSS

### 4.1 Modificar Strategy Service

- [x] **4.1.1** `buildStrategyPrompt` ya recibe `researchSummary` — funciona con BusinessProfile context ✅
- [x] **4.1.2** Agregar al prompt: si `themeType` es promocional, incluir instrucciones promocionales ✅ *(businessContext se pasa al prompt)*
- [x] **4.1.3** El `seedPrompt` del fallback usa datos dinámicos del BusinessProfile ✅
- [x] **4.1.4** Los hashtags fallback vienen del brandProfile/contentProfile ✅

### 4.2 Nuevos prompts de estrategia promocional

- [x] ✅ `buildPromotionalStrategyPrompt` — especializado en generar ángulos de venta *(implementado en business.prompts.ts)*
- [x] ✅ Variantes según `BriefType`:
  - `PRODUCT` → enfoque en beneficios, features, comparación
  - `OFFER` → urgencia, escasez, precio tachado vs nuevo
  - `TESTIMONIAL` → social proof, antes/después, transformación
  - `ANNOUNCEMENT` → exclusividad, novedad, expectativa
  - `SEASONAL` → relevancia temporal, countdown

---

## 5. PIPELINE-MEDIA BRIDGE: Usar assets del usuario en generación

### 5.1 El gap actual

Hoy el pipeline genera imágenes 100% con IA (DALL-E, Pollinations, SVG). **Nunca usa** las imágenes que el usuario sube a la Biblioteca (logos, productos, fondos). Para un negocio real esto es inaceptable — quieren VER su logo y sus productos en los posts.

### 5.2 Modelo de composición

- [x] **5.2.1** Crear servicio `MediaComposerService` que tome: ✅ *(implementado como ImageComposer en packages/media + método generatePromotionalImage en MediaEngineService)*
  - `backgroundImage: URL` (generada por IA o UserMedia tipo BACKGROUND)
  - `productImage?: URL` (UserMedia tipo PRODUCT)
  - `logoImage?: URL` (UserMedia tipo LOGO, marcado `isLogo: true`)
  - `overlayText?: { headline, subtitle, price, discount }` 
  - `template: string` (nombre de plantilla de composición)
  - Output: imagen compuesta con logo + producto + texto superpuesto

### 5.3 Templates de composición

- [x] **5.3.1** Crear sistema de templates SVG/Canvas para composición: ✅ *(ImageComposer tiene 7 templates: product-showcase, offer-banner, logo-watermark, testimonial-card, announcement, minimal-product, price-tag)*
  - ✅ `product-showcase` — producto centrado + nombre + precio + fondo
  - ✅ `offer-banner` — descuento grande + producto + precio tachado + nuevo precio
  - ✅ `logo-watermark` — cualquier imagen + logo en esquina (marca de agua)
  - [x] `carousel-product` ✅ *(implementado en ImageComposer.renderCarouselProduct)*
  - ✅ `testimonial-card` — foto de persona + quote + nombre + estrellas
  - ✅ `announcement` — headline grande + imagen de fondo + logo
  - [x] `before-after` ✅ *(implementado en ImageComposer.renderBeforeAfter)*

### 5.4 Conexión del pipeline con UserMedia

- [x] **5.4.1** En la etapa `media` del pipeline editorial: ✅ *(media-engine.service.ts detecta temas promocionales, carga UserMedia productos + logo)*
  - ✅ Detectar si el `ContentTheme.type` es promocional
  - ✅ Si hay `theme.productMediaIds` → cargar esas UserMedia como inputs
  - ✅ Si no hay → buscar UserMedia con `useInPipeline: true` + `category: PRODUCT`
  - ✅ Siempre buscar UserMedia con `isLogo: true` para superponer como marca de agua
  
- [x] **5.4.2** Modificar `MediaEngineService`: ✅
  - Método actual: `generateImage(prompt)` → se mantiene
  - ✅ Nuevo método: `generatePromotionalImage(options)` → genera fondo con IA + superpone producto/logo
  - ✅ Logo watermark overlay integrado en el pipeline

- [x] **5.4.3** ✅ En `media-engine.service.ts` (executeMediaGeneration):
  - ✅ Si el tema es promocional y hay pipelineMedia → usa `generatePromotionalImage()` en vez de solo `generateSingleImage()`
  - ✅ El imagePrompt del LLM describe el fondo/contexto, el producto se superpone de la biblioteca

### 5.5 Implementación técnica de composición

- [x] **5.5.1** ✅ Usar **Sharp** (Node.js) para composición de imágenes en servidor *(implementado en packages/media/src/composers/sharp-renderer.ts)*:
  - ✅ Resize + crop del fondo generado
  - ✅ Overlay del producto con transparencia
  - ✅ Overlay del logo con posicionamiento configurable
  - ✅ Renderizado de texto (precio, descuento, headline)
  - ✅ Exportar SVG → PNG para templates más complejos

- [ ] **5.5.2** ⏭️ OPCIONAL — Alternativa: usar **Cloudinary** transformations *(Sharp ya cubre esta necesidad, Cloudinary queda como mejora futura)*:
  - `l_fetch:productUrl/fl_layer_apply,g_center` para superponer producto
  - `l_fetch:logoUrl/fl_layer_apply,g_south_east,w_100` para logo

---

## 6. FRONTEND: Página de BusinessBriefs

### 6.1 Nueva página `/dashboard/business-briefs`

- [x] Crear `apps/web/src/app/dashboard/business-briefs/page.tsx` ✅ *(creado en /dashboard/my-business/briefs/)*
- [x] Grid de cards con los briefs del negocio ✅
- [x] Cada card muestra: tipo (icono), título, producto, precio, vigencia, estado (activo/inactivo) ✅
- [x] Formulario de creación: tipo, título, contenido, producto, precio, URL, descuento, fechas, seleccionar media ✅
- [x] Picker de UserMedia para asociar imágenes del producto ✅ *(implementado como componente UserMediaPicker en briefs-list.tsx)*
- [x] Contador de "veces usado" para saber qué briefs generan más contenido ✅ *(usageCount en modelo)*

### 6.2 Agregar al sidebar

- [x] Nuevo item en sección "Contenido": `Mi Negocio` con sub-items (Perfil, Briefs, Productos) ✅
- [x] Visible para todos los planes ✅

### 6.3 Modificar página de Temas

- [x] ✅ Al crear un tema, si `type` es `PRODUCT | OFFER | SERVICE`, mostrar campos extra *(implementado en theme-form-fields.tsx)*:
  - ✅ Nombre del producto
  - ✅ Precio
  - ✅ URL de compra
  - ✅ Texto de descuento
  - ✅ Fechas de vigencia
  - ✅ Selector de imágenes de producto (de la Biblioteca)

### 6.4 Modificar página de Biblioteca/Media

- [x] Agregar campo `productName` editable en el modal de edición ✅ *(en página /my-business/products)*
- [x] Agregar campo `productPrice` editable ✅
- [x] Agregar campo `productUrl` editable ✅
- [x] Agregar campo `productDescription` editable ✅
- [x] Agregar toggle `useInPipeline` — "Usar en publicaciones automáticas" ✅
- [x] Agregar toggle `isLogo` — "Este es mi logo principal" ✅
- [x] Agregar nuevas categorías: `PROMOTION`, `BANNER`, `OFFER_IMAGE`, `BRAND_ELEMENT` ✅
- [x] Preview de cómo se vería el producto compuesto con un template ✅ *(implementado como TemplatePreview en components/template-preview.tsx)*

---

## 7. FRONTEND: Wizard rápido "Crear promoción"

### 7.1 Flujo simplificado para crear contenido promocional

- [x] ✅ Botón "Crear Promoción" en el dashboard principal *(Link en dashboard/page.tsx)*
- [x] ✅ Wizard de 3 pasos *(implementado en dashboard/create-promotion/page.tsx)*:
  1. **Qué promocionar**: Seleccionar producto de la biblioteca o crear uno nuevo (nombre, foto, precio)
  2. **Tipo de contenido**: Oferta con descuento / Showcase de producto / Testimonio / Anuncio
  3. **Generar**: Lanza el pipeline editorial con los datos internos (sin RSS)
- [x] ✅ El wizard crea automáticamente: BusinessBrief + ContentTheme (tipo PRODUCT/OFFER) + EditorialRun
- [x] ✅ El usuario solo tiene que aprobar el resultado

---

## 8. Onboarding: Presets por industria (ya parcial)

### 8.1 Mejorar presets existentes

El servicio `onboarding.service.ts` **ya tiene presets por industria** (ecommerce, restaurant, fitness, realestate, tech, beauty, generic) con temas como "Producto del día", "Oferta flash", "Testimonio cliente". Esto está bien.

- [x] **8.1.1** ✅ Agregar `ThemeType` correcto a cada tema del preset *(INDUSTRY_PRESETS usa objetos {name, type})*:
  - "Producto del día" → `PRODUCT`
  - "Oferta flash" → `OFFER`  
  - "Testimonio cliente" → `TESTIMONIAL`
  - "Detrás de escena" → `BEHIND_SCENES`
  - "Tutorial producto" → `EDUCATIONAL`

- [x] **8.1.2** ✅ Agregar más industrias al preset *(12 industrias total)*:
  - `clothing` — Moda y ropa
  - `services` — Servicios profesionales (dentista, abogado, contador)
  - `education` — Cursos, academia
  - `travel` — Turismo, hotel
  - `pets` — Mascotas, veterinaria

- [x] **8.1.3** ✅ Que el onboarding pregunte: "¿De qué se trata tu negocio?" → usa la respuesta como `workspace.industry` y como contexto dinámico para todos los prompts *(OnboardingData.businessDescription → BusinessProfile.description, paso en onboarding-checklist.tsx)*

---

## 9. Resumen de impacto por archivo

| Archivo | Tipo de cambio | Esfuerzo |
|---------|---------------|----------|
| `packages/ai/src/prompts/content.prompts.ts` | Parametrizar roles hardcodeados (L68, L116) | 🟢 Bajo |
| `packages/ai/src/prompts/research.prompts.ts` | Parametrizar roles (L68, L69, L113) | 🟢 Bajo |
| `packages/ai/src/prompts/strategy.prompts.ts` | Parametrizar rol (L122) | 🟢 Bajo |
| `packages/ai/src/prompts/trend.prompts.ts` | Cambiar fallback keywords (L46) | 🟢 Bajo |
| `packages/ai/src/prompts/business.prompts.ts` | **NUEVO** — prompts para contenido de negocio | 🟡 Medio |
| `apps/api/src/strategy/strategy.service.ts` | Cambiar fallbacks hardcodeados (L246, L251) | 🟢 Bajo |
| `apps/api/src/research/research.service.ts` | Agregar path de research interno sin RSS | 🔴 Alto |
| `apps/api/src/editorial/editorial-orchestrator.service.ts` | Pasar themeType al research | 🟡 Medio |
| `apps/api/src/editorial/editorial-worker.service.ts` | Conectar UserMedia al pipeline de media | 🔴 Alto |
| `apps/api/src/media/media-engine.service.ts` | Agregar composición de imágenes | 🔴 Alto |
| `apps/api/src/business-briefs/*` | **NUEVO** — CRUD de briefs internos | 🟡 Medio |
| `packages/db/prisma/schema.prisma` | Nuevos enums, campos, modelo BusinessBrief | 🟡 Medio |
| `apps/web/src/app/dashboard/business-briefs/page.tsx` | **NUEVO** — página de briefs | 🟡 Medio |
| `apps/web/src/app/dashboard/media/page.tsx` | Campos de producto, toggles pipeline/logo | 🟡 Medio |
| `apps/web/src/app/dashboard/themes/page.tsx` | Campos de producto en temas promocionales | 🟡 Medio |
| `apps/api/src/onboarding/onboarding.service.ts` | ThemeTypes correctos, más industrias | 🟢 Bajo |
| `apps/web/src/components/layout/sidebar.tsx` | Nuevo item "Mi Negocio" | 🟢 Bajo |

---

## 10. Orden de implementación sugerido

### Fase 1: Roles dinámicos (1 día) ⚡
1. Parametrizar todos los prompts hardcodeados (sección 1)
2. Pasar `workspace.industry` desde los servicios
3. Cambiar fallbacks en strategy.service.ts

### Fase 2: Schema + BusinessBriefs (2 días)
4. Nuevos enums en schema (ThemeType, SourceType, MediaCategory, CampaignObjective)
5. Campos de producto en ContentTheme y UserMedia
6. Modelo BusinessBrief + migración
7. CRUD de BusinessBriefs (API + frontend)

### Fase 3: Research interno (2-3 días) 🔑
8. Path alternativo en research.service.ts sin RSS
9. Nuevo prompt `buildBusinessResearchPrompt`
10. Strategy que funcione con datos internos

### Fase 4: Media Bridge (3-4 días) 🔑
11. Servicio de composición de imágenes (Sharp/Cloudinary)
12. Templates de composición (product-showcase, offer-banner, etc.)
13. Conexión pipeline → UserMedia (logo overlay, producto)

### Fase 5: UI/UX (2 días)
14. Página de Business Briefs
15. Campos de producto en Media y Temas
16. Wizard "Crear Promoción"

**Total estimado: ~10-12 días de desarrollo**

---

## Comparativa: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Fuente de datos | RSS/noticias externas | RSS + datos internos del negocio |
| Roles de IA | Hardcodeado "tech/IA" | Dinámico según industria del usuario |
| Tipos de tema | TRENDING / EVERGREEN | + PRODUCT, OFFER, SERVICE, TESTIMONIAL, etc. |
| Research | Siempre busca artículos RSS | Puede usar briefs internos (productos, ofertas) |
| Imágenes | 100% generadas por IA | IA + composición con logo/productos del usuario |
| Biblioteca | Solo almacena archivos | Almacena + conecta al pipeline + metadata de producto |
| Pipeline | News-driven | Puede ser news-driven O business-driven |
| Onboarding | Temas genéricos | Temas según industria con ThemeType correcto |
