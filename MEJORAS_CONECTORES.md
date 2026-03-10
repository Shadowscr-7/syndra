# Mejoras: Conectores de Publicación Avanzados

> Roadmap de integraciones futuras para ampliar los canales de distribución de Syndra.

---

## 1. WhatsApp Status (via Evolution API)

### Descripción
Publicar automáticamente en **Estados de WhatsApp** del negocio usando [Evolution API](https://doc.evolution-api.com/) como gateway WhatsApp.

### Arquitectura
```
Syndra Pipeline → PublisherService → WhatsAppStatusAdapter → Evolution API → WhatsApp
```

### Configuración necesaria
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `EVOLUTION_API_URL` | string | URL de la instancia Evolution API (self-hosted) |
| `EVOLUTION_API_KEY` | string | API Key global de Evolution |
| `EVOLUTION_INSTANCE_NAME` | string | Nombre de la instancia WhatsApp (vinculada al número) |

### Endpoints Evolution API a usar
- `POST /message/sendStatus` — Publicar estado (texto, imagen, video)
- `POST /message/sendMedia` — Enviar media como estado
- `GET /instance/connectionState` — Verificar conexión del número

### Capacidades
- [x] Imágenes con caption (promociones, carruseles)
- [x] Videos cortos (reels convertidos a status)
- [x] Texto con fondo de color
- [x] Segmentación por lista de contactos (opcional)
- [x] Duración automática 24h (nativo de WhatsApp)

### Flujo de configuración para el usuario
1. El usuario despliega Evolution API (Docker) o usa un hosting
2. Escanea QR desde el dashboard de Syndra (iframe/redirect a Evolution)
3. Syndra guarda las credenciales cifradas en `UserCredential`
4. Al publicar, el adapter envía el contenido como Estado

### Adapter (esqueleto)
```typescript
// packages/publishers/src/adapters/whatsapp-status.ts
export class WhatsAppStatusAdapter implements PublisherAdapter {
  async publish(post: PublishPayload): Promise<PublishResult> {
    // POST /message/sendStatus con media del editorial run
  }
  async testConnection(): Promise<boolean> {
    // GET /instance/connectionState
  }
}
```

---

## 2. Meta Ads (Facebook Ads + Instagram Ads)

### Descripción
Crear **campañas publicitarias automatizadas** en Meta Ads desde contenido generado por Syndra.

### Arquitectura
```
Syndra Content → MetaAdsAdapter → Marketing API → Facebook/Instagram Ads
```

### Configuración necesaria
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `META_ADS_ACCESS_TOKEN` | string | System User Token con permisos de ads |
| `META_AD_ACCOUNT_ID` | string | ID de la cuenta publicitaria (act_XXXXX) |
| `META_PAGE_ID` | string | ID de la página de Facebook |
| `META_INSTAGRAM_ACTOR_ID` | string | ID del perfil de Instagram vinculado |
| `META_PIXEL_ID` | string | (Opcional) Pixel para tracking de conversiones |

### Endpoints Marketing API a usar
- `POST /{ad_account_id}/campaigns` — Crear campaña
- `POST /{ad_account_id}/adsets` — Crear conjunto de anuncios (audiencia + presupuesto)
- `POST /{ad_account_id}/adcreatives` — Crear creatividad con imagen/video
- `POST /{ad_account_id}/ads` — Crear anuncio vinculando creative + adset
- `GET /{ad_id}/insights` — Métricas de rendimiento

### Capacidades
- [x] Campañas de awareness (alcance)
- [x] Campañas de tráfico (click a web/WhatsApp)
- [x] Campañas de engagement (interacciones)
- [x] Creatividades con imagen, carrusel o video
- [x] Audiencias guardadas, lookalike, custom
- [x] Presupuesto diario o por duración
- [x] Tracking de métricas en dashboard de Syndra

### Flujo de configuración
1. El usuario conecta su cuenta Meta Business via OAuth (ya existente)
2. Selecciona la cuenta publicitaria en el dashboard
3. Configura presupuesto por defecto y audiencia base
4. Al crear una "Promoción" en Syndra, se genera la campaña completa

### Configuración adicional en modelo de datos
```prisma
model AdCampaignConfig {
  id              String   @id @default(cuid())
  workspaceId     String
  platform        String   // 'meta_ads'
  defaultBudget   Float    @default(5.00)  // USD diario
  defaultAudience Json?    // Audiencia guardada
  defaultObjective String  @default("OUTCOME_AWARENESS")
  adAccountId     String
  pixelId         String?
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  createdAt       DateTime @default(now())
}
```

---

## 3. Google Ads

### Descripción
Crear **campañas de Google Ads** (Display, Performance Max, YouTube Ads) desde contenido de Syndra.

### Arquitectura
```
Syndra Content → GoogleAdsAdapter → Google Ads API v17 → Google Network
```

### Configuración necesaria
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `GOOGLE_ADS_CLIENT_ID` | string | OAuth2 Client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | string | OAuth2 Client Secret |
| `GOOGLE_ADS_REFRESH_TOKEN` | string | Refresh token del usuario |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | string | Token de desarrollador (MCC) |
| `GOOGLE_ADS_CUSTOMER_ID` | string | ID de la cuenta de Google Ads |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | string | (Opcional) MCC parent ID |

### Endpoints / Recursos API
- `CampaignService.MutateCampaigns` — Crear campaña
- `AdGroupService.MutateAdGroups` — Crear grupo de anuncios
- `AdGroupAdService.MutateAdGroupAds` — Crear anuncios
- `AssetService.MutateAssets` — Subir imágenes/videos como assets
- `GoogleAdsService.SearchStream` — Consultar métricas

### Tipos de campaña soportados
- [x] **Display**: Banners con imágenes generadas por Syndra
- [x] **Performance Max**: Google optimiza distribución automáticamente
- [x] **YouTube Ads**: Videos generados por Syndra como anuncios in-stream/bumper
- [x] **Demand Gen**: Feeds visuales en Discover, Gmail, YouTube

### Consideraciones
- Requiere aprobación de Developer Token (proceso de Google)
- OAuth2 flow necesario para vincular cuenta
- Las creatividades deben cumplir políticas de Google Ads
- Performance Max requiere múltiples assets (títulos, descripciones, imágenes, logos)

---

## 4. Mercado Libre

### Descripción
Publicar y gestionar **productos/promociones en Mercado Libre** usando contenido generado por Syndra.

### Arquitectura
```
Syndra Content → MercadoLibreAdapter → ML API → Mercado Libre Marketplace
```

### Configuración necesaria
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ML_APP_ID` | string | Application ID de la app en Mercado Libre |
| `ML_CLIENT_SECRET` | string | Client Secret |
| `ML_ACCESS_TOKEN` | string | Access Token (OAuth2, refresh automático) |
| `ML_REFRESH_TOKEN` | string | Refresh Token |
| `ML_SITE_ID` | string | Site ID (MLM para México, MLA para Argentina, etc.) |
| `ML_USER_ID` | string | ID del vendedor |

### Endpoints API de Mercado Libre
- `POST /items` — Crear publicación/producto
- `PUT /items/{id}` — Actualizar publicación
- `POST /items/{id}/pictures` — Agregar fotos (generadas por Syndra)
- `POST /items/{id}/description` — Agregar descripción enriquecida
- `GET /items/{id}` — Consultar estado de publicación
- `POST /seller-promotions/items/{id}` — Crear promoción/descuento
- `GET /orders/search` — Consultar ventas

### Capacidades
- [x] Crear publicaciones con imágenes AI-generated
- [x] Descripciones optimizadas por IA (SEO para ML)
- [x] Promociones automáticas (descuentos, envío gratis)
- [x] Actualización masiva de precios y stock
- [x] Métricas de visitas y conversión
- [x] Respuestas automáticas a preguntas (con IA)

### Flujo de configuración
1. El usuario autoriza Syndra via OAuth2 de Mercado Libre
2. Syndra obtiene tokens y los guarda cifrados
3. Al crear una "promoción" o "publicación ML", Syndra genera:
   - Título optimizado (IA)
   - Descripción con keywords (IA)
   - Imágenes del producto (retocadas por IA si es necesario)
4. Se publica automáticamente en la categoría correcta

### Configuración adicional en modelo de datos
```prisma
model MercadoLibreConfig {
  id              String   @id @default(cuid())
  workspaceId     String
  siteId          String   @default("MLM")  // México
  sellerId        String
  defaultCategory String?
  autoPromotions  Boolean  @default(false)
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  createdAt       DateTime @default(now())
}
```

---

## 5. Prioridad de Implementación

| # | Conector | Esfuerzo | Impacto | Prioridad |
|---|----------|----------|---------|-----------|
| 1 | **WhatsApp Status** (Evolution API) | Bajo (1-2 días) | Alto — canal masivo en LATAM | 🔴 Alta |
| 2 | **Meta Ads** | Medio (3-5 días) | Alto — monetización directa | 🔴 Alta |
| 3 | **Mercado Libre** | Medio (3-5 días) | Alto — e-commerce directo | 🟡 Media |
| 4 | **Google Ads** | Alto (5-7 días) | Medio — requiere aprobación Google | 🟡 Media |

---

## 6. Conectores de Redes Sociales Pendientes (Publishers)

Además de los conectores de ads/commerce, faltan publishers orgánicos:

| Plataforma | API | Esfuerzo | Estado actual |
|---|---|---|---|
| **Twitter/X** | X API v2 (OAuth 2.0) | 2 días | No existe adapter |
| **LinkedIn** | LinkedIn Marketing API | 2 días | No existe adapter |
| **TikTok** | TikTok Content Posting API | 3 días | No existe adapter |
| **YouTube** | YouTube Data API v3 (upload) | 2 días | No existe adapter |
| **Pinterest** | Pinterest API v5 (Pins) | 1 día | No existe adapter |
| **Telegram Channel** | Bot API (sendPhoto/sendVideo) | 1 día | Bot existe, falta canal post |

---

## 7. Notas Técnicas

### Patrón de implementación
Cada conector sigue el patrón existente:
1. **Adapter** en `packages/publishers/src/adapters/{platform}.ts` — implementa `PublisherAdapter`
2. **Credential type** nuevo en `UserCredential.provider` enum del schema Prisma
3. **Test endpoint** en `credentials.service.ts` para validar keys
4. **Config UI** en `apps/web/src/app/dashboard/credentials/` con formulario específico
5. **Registro** en `publisher.service.ts` → `getAdaptersForWorkspace()`

### Evolution API para WhatsApp
- **Self-hosted**: Docker compose, base de datos propia
- **Versión recomendada**: v2.x con soporte multi-device
- **Alternativa sin Evolution API**: Twilio WhatsApp Business API (más caro, más estable)
- **QR pairing**: Evolution API expone endpoint para generar QR, Syndra lo muestra en iframe

### Validación de creatividades
Para Meta Ads y Google Ads, implementar un **AdComplianceChecker** que:
- Valide dimensiones de imagen (1080x1080, 1200x628, etc.)
- Verifique políticas de texto en imagen (<20% para Meta)
- Revise contenido prohibido (alcohol, tabaco, etc.)
- Sugiera mejoras antes de enviar a la plataforma
