# MEJORAS 4 — Proveedores de IA para Imágenes, Video y Animación

> **Objetivo:** Ampliar las capacidades de generación visual de Syndra con múltiples proveedores de IA,
> priorizando opciones gratuitas o de muy bajo costo (créditos), diferenciando entre planes Creator y Pro.

---

## 📊 Estado actual — ¿Qué tenemos implementado?

### Imágenes (adaptadores existentes)

| Proveedor | Estado | Costo | Calidad texto | Archivo |
|-----------|--------|-------|---------------|---------|
| **Pollinations (Flux)** | ✅ Producción | 🟢 Gratis, sin API key | ❌ Mala | `packages/media/src/adapters/pollinations.ts` |
| **HuggingFace (FLUX.1-schnell)** | ✅ Producción | 🟢 Gratis (token gratuito) | ❌ Mala | `packages/media/src/adapters/huggingface.ts` |
| **DALL-E 3 (OpenAI)** | ✅ Adaptador listo | 🔴 $0.04-$0.12/img | ⚠️ Aceptable | `packages/media/src/adapters/image-generator.ts` |
| **Stability AI (SDXL)** | ⚠️ Adaptador sin factory | 🟡 Créditos | ❌ Mala | `packages/media/src/adapters/image-generator.ts` |
| **Mock** | ✅ Dev fallback | 🟢 Gratis | N/A | `packages/media/src/adapters/image-generator.ts` |

### Video (adaptadores existentes)

| Proveedor | Estado | Costo | Tipo | Archivo |
|-----------|--------|-------|------|---------|
| **HeyGen** | ✅ Adaptador real | 🔴 Suscripción cara ($59+/mo) | Avatar hablando | `packages/media/src/adapters/heygen.ts` |
| **Pika** | ⚠️ Solo mock | 🟡 Pendiente API | Video corto | `packages/media/src/adapters/pika-video.ts` |
| **Luma Dream Machine** | ⚠️ Solo mock | 🟡 Pendiente API | Video corto | `packages/media/src/adapters/luma-video.ts` |
| **Local GPU (SVD/WAN/Hunyuan)** | ⚠️ Mock sin GPU | 🟢 Self-hosted | Animación | `packages/media/src/adapters/local-gpu-video.ts` |
| **Composite (Edge TTS + ffmpeg)** | ⚠️ Skeleton | 🟢 Gratis | Narración + imágenes | `packages/media/src/adapters/composite-video.ts` |
| **Mock** | ✅ Dev fallback | 🟢 Gratis | N/A | `packages/media/src/adapters/mock-video.ts` |

### Voz/TTS

| Proveedor | Estado | Costo |
|-----------|--------|-------|
| **ElevenLabs** | ✅ Adaptador real | 🔴 Suscripción ($5+/mo) |
| **Edge TTS (Microsoft)** | ✅ Producción | 🟢 Gratis |

---

## 🎯 Capacidades que necesitamos cubrir

| # | Capacidad | Plan mínimo | Prioridad |
|---|-----------|-------------|-----------|
| 1 | **Imágenes de alta calidad** (fotos realistas, arte) | Starter | 🔴 Alta |
| 2 | **Imágenes con texto legible** (banners, ofertas, "30% OFF") | Creator | 🔴 Alta |
| 3 | **Animación de imagen** (producto que gira, zoom in) | Pro | 🟡 Media |
| 4 | **Video corto para Reels** (5-15s, vertical 9:16) | Creator | 🟡 Media |
| 5 | **Video con Avatar IA** (avatar personalizado persistente) | Pro | 🟡 Media |

---

## 🔬 Investigación de proveedores — TODAS las opciones

### 1. IMÁGENES DE CALIDAD

| Proveedor | Costo | Calidad | Free tier | API REST | Notas |
|-----------|-------|---------|-----------|----------|-------|
| **Pollinations (Flux)** | Gratis | ⭐⭐⭐ | ✅ Ilimitado | ✅ Simple GET | Ya implementado. Sin API key. Buena calidad general pero NO renderiza texto |
| **HuggingFace Inference (FLUX.1-schnell)** | Gratis | ⭐⭐⭐ | ✅ Rate-limited | ✅ REST | Ya implementado. 4 steps, rápido. No renderiza texto |
| **Replicate (FLUX.1-schnell)** | $0.003/img | ⭐⭐⭐ | $5 crédito inicial | ✅ REST | ~333 imágenes por $1. Apache license. Rápido (<1s) |
| **Replicate (FLUX.1-dev)** | $0.025/img | ⭐⭐⭐⭐ | $5 crédito inicial | ✅ REST | Más calidad que schnell. 40 imgs por $1 |
| **fal.ai (Flux Kontext Pro)** | $0.04/img | ⭐⭐⭐⭐ | Crédito de prueba | ✅ REST | 25 imgs por $1. Buen prompt following |
| **Together.ai (Flux.1-schnell)** | ~$0.003/img | ⭐⭐⭐ | $1 crédito inicial | ✅ REST | Compatible OpenAI SDK |
| **DALL-E 3** | $0.04-$0.12/img | ⭐⭐⭐⭐ | ❌ | ✅ REST | Ya implementado. Caro pero buena calidad |
| **Luma Photon** | $0.016/img (fast) a $0.06 | ⭐⭐⭐⭐ | Crédito de prueba | ✅ REST | Muy bueno en prompt adherence y texto |

### 2. IMÁGENES CON TEXTO LEGIBLE (banners, "30% OFF", logos)

| Proveedor | Costo | Calidad texto | Free tier | API | Notas |
|-----------|-------|---------------|-----------|-----|-------|
| **Ideogram v3** | ~$0.015/img (turbo) | ⭐⭐⭐⭐⭐ MEJOR | ❌ (plan $15/mo = 1000 créditos) | ✅ REST | **El mejor del mercado para texto en imágenes**. Renderiza tipografía perfecta |
| **Replicate (Ideogram v3 Quality)** | $0.09/img | ⭐⭐⭐⭐⭐ | $5 crédito inicial | ✅ REST | Ideogram via Replicate, sin suscripción |
| **Replicate (Recraft v3)** | $0.04/img | ⭐⭐⭐⭐ | $5 crédito inicial | ✅ REST | Muy bueno en texto y diseño gráfico |
| **Luma Photon** | $0.016-$0.06/img | ⭐⭐⭐⭐ | Crédito de prueba | ✅ REST | Buen texto rendering, no tan perfecto como Ideogram |
| **DALL-E 3** | $0.04-$0.12/img | ⭐⭐⭐ | ❌ | ✅ REST | Aceptable pero inconsistente con texto |
| **Sharp Composition (ya implementado)** | Gratis (local) | ⭐⭐⭐⭐⭐ | ✅ | Local | Superpone texto/logo/precio con Sharp. **Ya lo tenemos.** Perfecto para overlays |

> **💡 Conclusión:** Para texto en imágenes la mejor estrategia es **doble capa**:
> 1. Generar imagen base con Flux/Pollinations (gratis)
> 2. Componer texto con Sharp (precio, descuento, logo) — **ya implementado**
>
> Para banners donde el texto ES la imagen (tipografía artística), usar **Ideogram v3** vía Replicate ($0.09/img) o **Recraft v3** ($0.04/img).

### 3. ANIMACIÓN DE IMAGEN (producto girando, zoom, pan)

| Proveedor | Costo | Duración | Free tier | API | Notas |
|-----------|-------|----------|-----------|-----|-------|
| **Replicate (Wan 2.1 i2v 480p)** | $0.09/s de video | 3-5s | $5 crédito inicial | ✅ REST | ~$0.45 por animación de 5s. Buena calidad. Open source |
| **Replicate (Wan 2.1 i2v 720p)** | $0.25/s | 3-5s | $5 crédito inicial | ✅ REST | HD. ~$1.25 por animación de 5s |
| **fal.ai (Wan 2.5)** | $0.05/s | 3-10s | Crédito de prueba | ✅ REST | ~$0.25 por animación de 5s. Más barata |
| **Luma Ray 2 (Image-to-Video)** | $0.05/s (fast) a $0.06 | 5-10s | Crédito de prueba | ✅ REST | Loop, camera control, extend |
| **Kling 2.5 Turbo (via fal.ai)** | $0.07/s | 5-10s | Crédito de prueba | ✅ REST | Muy buena calidad de movimiento |
| **Stable Video Diffusion (local)** | Gratis (GPU propia) | 4s | ✅ Si tienes GPU | Local | Ya tenemos adaptador mock. Necesita RTX 3090+ |

### 4. VIDEO CORTO PARA REELS (5-15s, vertical, text-to-video)

| Proveedor | Costo | Duración | Free tier | API | Notas |
|-----------|-------|----------|-----------|-----|-------|
| **Replicate (Wan 2.1 t2v 480p)** | ~$0.09/s | 5-15s | $5 crédito | ✅ REST | Text-to-video. ~$0.90 por 10s |
| **fal.ai (Wan 2.5)** | $0.05/s | 5-20s | Crédito | ✅ REST | Más barata. ~$0.50 por 10s |
| **Luma Ray 2** | $0.05-$0.06/s | 5-10s | Crédito | ✅ REST | Mejor calidad cinematográfica |
| **fal.ai (Kling 2.5)** | $0.07/s | 5-10s | Crédito | ✅ REST | Muy realista |
| **fal.ai (Veo 3 — Google)** | $0.40/s | 3-8s | Crédito | ✅ REST | Frontier quality pero caro |
| **Edge TTS + ffmpeg Composite** | Gratis | 15-60s | ✅ Gratis | Local | Ya tenemos skeleton. Narración + slides. Sin IA generativa real |

### 5. VIDEO CON AVATAR IA (avatar personalizado, persistente)

| Proveedor | Costo | Avatar custom | Free tier | API | Notas |
|-----------|-------|---------------|-----------|-----|-------|
| **HeyGen** | $59/mo (Essential) | ✅ Foto → Avatar | ❌ | ✅ REST | Ya implementado. Avatar persistente. El mejor en labios/sync |
| **D-ID** | $3.99/mo (Lite, 5min) | ⚠️ Limitado | Trial | ✅ REST | Más barato. Avatar de foto. Calidad inferior a HeyGen |
| **Synthesia** | $22/mo (Starter) | ✅ Avatares stock | ❌ | ✅ REST | Muy profesional. Sin API pública abierta aún para custom avatar |
| **Hedra** | $9.99/mo (Creator) | ✅ Foto → Avatar | Trial | ✅ REST | Barato. Audio-driven face animation. Buena calidad |
| **Simli** | Pay-per-use (~$0.02/s) | ✅ Custom | $5 crédito | ✅ REST | Low latency streaming. Más barato por uso |
| **SadTalker (local, open source)** | Gratis (GPU propia) | ✅ Cualquier foto | ✅ Si GPU | Local | Open source. Necesita GPU. Calidad aceptable |

---

## ✅ Plan de implementación propuesto

### Sistema de créditos

```
Starter: 0 créditos IA (solo usa Pollinations/HuggingFace/Sharp gratis)
Creator: 100 créditos de regalo al crear cuenta + compra adicional
Pro:     Ilimitado (fair-use, ~500 operaciones premium/mes)
```

**Tabla de costos por crédito (referencia interna):**

| Operación | Créditos consumidos | Costo real aprox. |
|-----------|--------------------|--------------------|
| Imagen estándar (Flux gratis) | 0 créditos | $0.00 |
| Imagen con texto (Ideogram/Recraft via Replicate) | 5 créditos | ~$0.05 |
| Animación de producto (Wan 2.1 i2v, 5s) | 10 créditos | ~$0.25 |
| Video corto Reel (Wan 2.5, 10s) | 20 créditos | ~$0.50 |
| Video con Avatar (D-ID, 30s) | 30 créditos | ~$0.90 |
| Video con Avatar Premium (HeyGen, 30s) | 50 créditos | ~$2.00 |

**Paquetes de créditos para compra:**

| Paquete | Precio | Créditos | Costo/crédito |
|---------|--------|----------|---------------|
| Básico | $5 | 100 | $0.05 |
| Popular | $15 | 350 | $0.043 |
| Mega | $35 | 1000 | $0.035 |

---

### Fase 1 — Imágenes mejoradas (PRIORIDAD ALTA)

#### 1.1 Adaptador Replicate (multi-modelo)
- [ ] Crear `packages/media/src/adapters/replicate.ts`
- [ ] Soportar modelos: `flux-schnell` ($0.003), `flux-dev` ($0.025), `ideogram-v3` ($0.09), `recraft-v3` ($0.04)
- [ ] REST API: `POST https://api.replicate.com/v1/predictions` → poll status → get output
- [ ] Pasar modelo como parámetro, no hardcodeado
- [ ] Credential test: `GET /v1/account` (verificar API token válido)
- [ ] Env: `REPLICATE_API_TOKEN`

#### 1.2 Integrar Replicate en factory de imágenes
- [ ] Agregar `replicate` como opción en `media-engine.service.ts` factory switch
- [ ] Agregar `CredentialProvider.REPLICATE` y `UserCredentialProvider.REPLICATE` al schema Prisma
- [ ] UI: Agregar Replicate como proveedor seleccionable en perfil visual

#### 1.3 Selección inteligente de modelo de imagen
- [ ] Starter: Solo `pollinations` y `huggingface` (gratis)
- [ ] Creator: Además `replicate/flux-schnell` (barato, $0.003/img) — consume 1 crédito
- [ ] Pro: Además `replicate/ideogram-v3` y `replicate/recraft-v3` (texto perfecto) — consume 5 créditos
- [ ] El sistema elige automáticamente si el prompt requiere texto visible → usa Ideogram/Recraft
- [ ] Si no requiere texto → usa Flux gratis

#### 1.4 Composición Sharp mejorada para texto
- [ ] Ya tenemos Sharp composition. Mejorar para detectar tipo de template:
  - Si template tiene texto overlay (precio, descuento) → usar Flux gratis + Sharp overlay
  - Si se necesita tipografía artística integrada → usar Ideogram
- [ ] Anotar en el `ContentVersion` qué proveedor se usó y créditos consumidos

---

### Fase 2 — Animación de productos (Solo Pro)

#### 2.1 Adaptador Replicate Video (Wan 2.1 Image-to-Video)
- [ ] Crear `packages/media/src/adapters/replicate-video.ts`
- [ ] Modelo: `wavespeedai/wan-2.1-i2v-480p` (barato) y `wan-2.1-i2v-720p` (HD)
- [ ] Input: imagen del producto + motion prompt ("zoom in slowly, rotate 360")
- [ ] Output: MP4 de 3-5 segundos
- [ ] Polling con timeout de 120s

#### 2.2 Alternativa fal.ai para animación
- [ ] Crear `packages/media/src/adapters/fal-video.ts`
- [ ] Modelo: Wan 2.5 ($0.05/s) — más barato que Replicate
- [ ] API key: `FAL_KEY`
- [ ] Soportar image-to-video con camera control

#### 2.3 Integrar en VideoTierRouter
- [ ] Agregar `VideoProvider.REPLICATE_WAN` y `VideoProvider.FAL_WAN` al enum Prisma
- [ ] Registrar en Tier 1 (MVP) como alternativa real a los mocks Pika/Luma
- [ ] Gating: Solo usuarios Pro pueden animar productos
- [ ] Consume 10 créditos (Creator) o ilimitado (Pro)

#### 2.4 UI — Botón "Animar producto"
- [ ] En la card de producto, agregar botón "✨ Animar" (solo si plan Pro)
- [ ] Modal con opciones: "Zoom in", "Rotate", "Floating", "Bounce"
- [ ] Preview del video generado antes de publicar
- [ ] Guardar como MediaAsset con type `VIDEO` y provider `replicate_wan`

---

### Fase 3 — Video corto para Reels

#### 3.1 Adaptar Replicate Video para text-to-video
- [ ] Extender `replicate-video.ts` para soportar modo text-to-video
- [ ] Modelo: Wan 2.1 t2v para text-to-video
- [ ] Aspect ratio: 9:16 (vertical para Reels/Stories)
- [ ] Duración: 5-10 segundos
- [ ] Prompt enriquecido por el AI Strategist con contexto de la marca

#### 3.2 Alternativa Luma Ray 2
- [ ] Crear `packages/media/src/adapters/luma-ray.ts` (reemplazar mock actual)
- [ ] API real: `POST https://api.lumalabs.ai/dream-machine/v1/generations`
- [ ] Soportar: text-to-video, image-to-video, loop, extend, camera control
- [ ] Pricing: $0.05-$0.06/s — ~$0.50 por video de 10s

#### 3.3 Integrar en flujo editorial
- [ ] Al generar un ContentVersion con `format: 'reel'` o `'video'`, usar estos proveedores
- [ ] Cascade: intentar fal.ai Wan primero (más barato) → Replicate Wan → Luma → Mock
- [ ] Creator: 20 créditos por Reel
- [ ] Pro: Ilimitado

#### 3.4 Composite Video mejorado (gratis)
- [ ] Completar la implementación de `composite-video.ts`
- [ ] Edge TTS (gratis) genera narración de audio
- [ ] ffmpeg combina: imagen de fondo + texto animado + audio
- [ ] Resultado: slideshow-reel de 15-30s con transiciones
- [ ] **Esto es GRATIS** — disponible desde Starter como alternativa sin créditos
- [ ] Instalar `fluent-ffmpeg` y dependencias necesarias

---

### Fase 4 — Video con Avatar IA (Solo Pro)

#### 4.1 Adaptador D-ID (alternativa barata a HeyGen)
- [ ] Crear `packages/media/src/adapters/did-video.ts`
- [ ] API: `POST https://api.d-id.com/talks`
- [ ] Soportar: foto → avatar viviente con lip sync
- [ ] Pricing: $3.99/mo (Lite) = 5 min de video, o pay-per-use
- [ ] Más barato que HeyGen ($59/mo)
- [ ] Env: `DID_API_KEY`

#### 4.2 Adaptador Hedra (ultra barato)
- [ ] Crear `packages/media/src/adapters/hedra-video.ts`
- [ ] API: REST con API key
- [ ] Audio-driven face animation (sube foto + audio → video con cara hablando)
- [ ] Pricing: $9.99/mo (Creator) = bastante video
- [ ] Combinar con Edge TTS (gratis) para el audio
- [ ] Env: `HEDRA_API_KEY`

#### 4.3 Avatar persistente
- [ ] Modelo `AvatarProfile` en Prisma:
  ```prisma
  model AvatarProfile {
    id          String   @id @default(uuid())
    workspaceId String
    workspace   Workspace @relation(fields: [workspaceId], references: [id])
    name        String
    photoUrl    String   // foto original subida
    provider    String   // 'heygen' | 'did' | 'hedra'
    providerId  String?  // ID del avatar en el servicio externo
    voiceId     String?  // voz asignada
    createdAt   DateTime @default(now())
  }
  ```
- [ ] El usuario Pro sube UNA foto → se crea avatar en D-ID/HeyGen → se reutiliza siempre
- [ ] Cachear el providerId para no recrear el avatar cada vez

#### 4.4 Cascade de avatar providers
- [ ] HeyGen (si tiene API key configurada) → D-ID → Hedra → Edge TTS Composite (fallback gratis, sin avatar)
- [ ] Creator: 30 créditos por video de avatar (usa D-ID/Hedra)
- [ ] Pro: Ilimitado (usa HeyGen si configurado, sino D-ID)

---

### Fase 5 — Sistema de créditos

#### 5.1 Ya tenemos VideoCredit en Prisma
- [ ] Extender el modelo existente `VideoCredit` → renombrar a `AICredit` (o crear paralelo)
- [ ] Agregar campos: `source` enum (`PLAN`, `ADDON`, `PROMO`, `PURCHASE`)
- [ ] Hook en registro: asignar 100 créditos gratis a nuevos Creator
- [ ] Hook en upgrade a Pro: marcar como ilimitado

#### 5.2 Middleware de consumo de créditos
- [ ] Crear `CreditGuard` que intercepte operaciones de IA premium
- [ ] Antes de generar: verificar saldo suficiente
- [ ] Después de generar: deducir créditos del balance
- [ ] Pro: bypass completo (ilimitado)
- [ ] Starter: rechazar (solo gratis)

#### 5.3 Compra de créditos (Stripe)
- [ ] Endpoint: `POST /api/credits/purchase` { package: 'basic' | 'popular' | 'mega' }
- [ ] Integrar con Stripe Checkout (ya debería haber infraestructura de pagos)
- [ ] Webhook confirma pago → acreditar créditos
- [ ] UI: Página `/dashboard/credits` con balance actual, historial, botón comprar

#### 5.4 UI de créditos
- [ ] Widget en el sidebar/header mostrando "⚡ 87 créditos"
- [ ] En cada operación premium, mostrar "Esto consume X créditos"
- [ ] Notificación cuando quedan < 10 créditos
- [ ] Historial de consumo: qué se generó, cuándo, cuántos créditos

---

## 📋 Resumen de costos operativos para Syndra

### Costo CERO (gratis) — Operaciones sin créditos

| Operación | Proveedor | Limitación |
|-----------|-----------|------------|
| Imagen estándar | Pollinations / HuggingFace | Rate-limited en HF |
| Composición Sharp | Local (Node.js) | Ninguna |
| Voz/TTS | Edge TTS (Microsoft) | Ninguna |
| Video slideshow | Edge TTS + ffmpeg | CPU del servidor |

### Costo por uso — Operaciones con créditos

| Operación | Proveedor recomendado | Costo real | Créditos |
|-----------|----------------------|------------|----------|
| Imagen premium | Replicate Flux-schnell | $0.003 | 1 |
| Imagen con texto | Replicate Recraft v3 | $0.04 | 5 |
| Imagen con texto (best) | Replicate Ideogram v3 | $0.09 | 5 |
| Animación producto 5s | fal.ai Wan 2.5 | $0.25 | 10 |
| Reel 10s | fal.ai Wan 2.5 | $0.50 | 20 |
| Avatar video 30s | D-ID | $0.30 | 30 |
| Avatar video premium 30s | HeyGen | $2.00 | 50 |

### Costo mensual estimado por usuario activo

| Plan | Uso típico | Costo real para Syndra |
|------|-----------|----------------------|
| **Starter** | 40 imgs gratis + 5 slideshows | **$0.00** |
| **Creator** | 100 imgs gratis + 20 premium + 2 reels | **~$2.00/mes** |
| **Pro** | 300 imgs + 50 premium + 10 animaciones + 5 reels + 2 avatar | **~$15.00/mes** |

> Con Pro a $99/mes, el margen incluso con uso intensivo es de **~$84/mes por usuario**.
> Con Creator a $39/mes y 100 créditos gratis = ~$1 de costo → **~$38/mes de margen**.

---

## 🏗️ Arquitectura propuesta

```
┌─────────────────────────────────────────────────────────┐
│                    CreditGuard                          │
│  Starter: solo gratis | Creator: check balance | Pro: ∞ │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│              MediaEngine (imagen)                        │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │Pollina-  │  │HuggingFace│  │   Replicate          │  │
│  │tions     │  │(Flux      │  │  ┌───────────────┐   │  │
│  │(gratis)  │  │schnell)   │  │  │ flux-schnell  │   │  │
│  │          │  │(gratis)   │  │  │ flux-dev      │   │  │
│  └──────────┘  └───────────┘  │  │ ideogram-v3   │   │  │
│                               │  │ recraft-v3    │   │  │
│                               │  └───────────────┘   │  │
│                               └──────────────────────┘  │
│  + Sharp Composition (local, gratis, overlays texto)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           VideoTierRouter (video)                        │
│                                                          │
│  Tier 0: Composite (Edge TTS + ffmpeg) — GRATIS          │
│  Tier 1: fal.ai Wan 2.5 / Replicate Wan 2.1 — CRÉDITOS  │
│  Tier 2: Luma Ray 2 (img2vid, loop, extend) — CRÉDITOS   │
│  Tier 3: D-ID / Hedra (avatar) — CRÉDITOS                │
│  Tier 4: HeyGen (avatar premium) — PRO ONLY              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Orden de implementación recomendado

| Orden | Tarea | Impacto | Esfuerzo |
|-------|-------|---------|----------|
| 1 | **Fase 1.1-1.3** — Adaptador Replicate + factory | 🔴 Alto | 🟡 Medio |
| 2 | **Fase 5.1-5.2** — Sistema de créditos base | 🔴 Alto | 🟡 Medio |
| 3 | **Fase 3.4** — Composite video con ffmpeg (gratis) | 🟡 Medio | 🟢 Bajo |
| 4 | **Fase 2.1-2.3** — Animación con Replicate Wan | 🟡 Medio | 🟡 Medio |
| 5 | **Fase 3.1-3.3** — Video Reels con fal.ai/Wan | 🟡 Medio | 🟡 Medio |
| 6 | **Fase 4.1-4.2** — D-ID + Hedra adaptadores | 🟡 Medio | 🟡 Medio |
| 7 | **Fase 4.3-4.4** — Avatar persistente + cascade | 🟡 Medio | 🔴 Alto |
| 8 | **Fase 5.3-5.4** — Compra de créditos Stripe + UI | 🟢 Bajo | 🔴 Alto |

---

## 📌 Notas importantes

1. **Replicate es el MVP perfecto**: $5 de crédito gratis al registrarse, REST API simple, soporta Flux, Ideogram, Recraft, Wan 2.1 — un solo proveedor para imágenes + animación + video.

2. **fal.ai es la alternativa más barata para video**: Wan 2.5 a $0.05/s vs Replicate Wan a $0.09/s.

3. **No necesitamos Midjourney**: No tiene API pública. Flux + Ideogram cubren todo.

4. **Para texto en imágenes, la combo ganadora es**: Imagen base gratis (Flux) + Sharp overlay (logo, precio, descuento) para promociones. Solo usar Ideogram cuando se necesite tipografía artística integrada.

5. **D-ID es 15x más barato que HeyGen** para avatares básicos. Reservar HeyGen para Pro que quieran máxima calidad.

6. **Edge TTS + ffmpeg composite es el fallback gratis universal** — funciona sin créditos, produce slideshows narrados con transiciones. Perfecto para Starter.
