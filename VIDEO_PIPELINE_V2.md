# 🎬 Video Pipeline V2 — Plan de Implementación

## Resumen

Rediseño completo del Video Pipeline con dos opciones de generación:

| Opción | Motor | Créditos | Descripción |
|--------|-------|----------|-------------|
| **Opción 1** | Video Compositor (FFmpeg Pro) | 3 créditos | Video profesional con imágenes, TTS, subtítulos, música de fondo. Máx 60s |
| **Opción 2** | Kie AI (Kling 2.6) | 20 créditos | Reel IA generativo con prompt. Motor profesional text-to-video |

---

## 📋 Opción 1 — Video Compositor (FFmpeg Profesional)

### Concepto
Genera videos de hasta 60 segundos combinando imágenes del usuario, narración TTS, subtítulos y música de fondo. Todo renderizado server-side con FFmpeg.

> **Nota**: Se usa FFmpeg en lugar de Remotion porque el Dockerfile ya tiene FFmpeg instalado y no necesita Chromium (que agregaría ~400MB al contenedor).

### Flujo del usuario

```
1. Selecciona "Opción 1 — Video Compositor"
2. Tipo de video:
   - General (libre)
   - Lanzamiento / Oferta de Producto
3. Sube o selecciona imágenes (drag-and-drop + biblioteca + assets)
4. Escribe el prompt/guión del video
5. Configura audio (opcional):
   - Texto para narración TTS
   - Voz (selección de voces ES)
   - Velocidad / Tono
6. Subtítulos: Sí / No
7. Música de fondo: Sí / No (Suno, +3 créditos)
   - Estilo: upbeat, calm, corporate, energetic, cinematic
8. Aspect ratio: 9:16 (Reels) / 16:9 (YouTube) / 1:1 (Feed)
9. → Renderizar (3 créditos base + 3 si música = 6 máx)
```

### Modo "Lanzamiento / Oferta de Producto"
Cuando el usuario selecciona este modo, se muestran campos extra:
- **Seleccionar Logo** → Filtra imágenes de la biblioteca con categoría `LOGO`
- **Seleccionar Producto** → Filtra imágenes con categoría `PRODUCT`
- **Nombre del producto** (texto)
- **Precio / Oferta** (texto, ej: "$29.99" o "50% OFF")
- **CTA** (Call to Action, ej: "Compra ahora", "Link en bio")
- Las imágenes de logo y producto se procesan para adaptarlas al video (padding transparente, resize)

### Configuración TTS
- **Motor**: Edge TTS (gratis, integrado)
- **Voces disponibles**: es-AR-ElenaNeural, es-AR-TomasNeural, es-ES-ElviraNeural, es-MX-DaliaNeural, es-CO-GonzaloNeural
- **Parámetros**:
  - Velocidad: Lenta / Normal / Rápida
  - Tono: Bajo / Normal / Alto
- **Preview**: Botón para escuchar antes de renderizar

### Subtítulos
- Generados automáticamente desde el texto TTS
- Formato SRT sincronizado con el audio
- Estilo: Texto blanco con sombra, centrado abajo
- Se puede activar/desactivar

### Música de fondo (Suno via Kie)
- **Costo adicional**: 3 créditos (igual que en business content)
- **Volumen**: 20-30% del audio principal (automático)
- **Estilos**: upbeat, calm, corporate, energetic, cinematic
- Se mezcla con el TTS automáticamente

### Templates del Compositor
- **hook_intro**: Logo animado + texto de apertura (3-5s)
- **image_slide**: Imagen a pantalla completa con transición (3-5s por imagen)
- **product_showcase**: Producto centrado + precio/oferta overlay (4-6s)
- **text_overlay**: Texto sobre fondo gradient o imagen (3-4s)
- **cta_outro**: CTA final con logo + texto (3-5s)

### Arquitectura Técnica

```
Frontend (page.tsx)
  → POST /api/videos/render-compositor
    → VideoCompositorService
      → 1. Procesa imágenes (resize, padding)
      → 2. Genera TTS (EdgeTTS)
      → 3. [Opcional] Genera música (Suno/Kie, +3 créditos)
      → 4. Genera subtítulos SRT
      → 5. Renderiza con FFmpeg Pro (transitions, overlays, burns)
      → 6. Sube a Cloudinary
      → 7. Guarda MediaAsset
```

---

## 📋 Opción 2 — Kie AI (Reel IA Generativo)

### Concepto
Genera un reel/video corto completamente con IA usando Kling 2.6 (text-to-video), el mejor motor disponible para reels de redes sociales.

### Flujo del usuario

```
1. Selecciona "Opción 2 — Kie AI Video"
2. Escribe el prompt descripitvo del video que quiere
3. Duración: 5s o 10s (limitación del motor)
4. Aspect ratio: 9:16 / 16:9 / 1:1
5. → Generar (20 créditos)
6. Polling automático hasta completado (~2-5 min)
```

### Costo: 20 créditos
Justificación: Kling 2.6 es un motor premium de text-to-video. El costo ya existente en el sistema para `VIDEO_KIE_VIDEO` es 15, pero lo subimos a 20 por usar el modelo más avanzado (kling-2.6).

### Arquitectura
```
Frontend (page.tsx)
  → POST /api/videos/render-kie
    → KieVideoAdapter.generateTextToVideo(prompt, options)
    → VideoRenderJob (QUEUED → RENDERING → COMPLETED)
    → Worker polls hasta completado
    → Sube a Cloudinary
```

---

## 🔧 Tareas de Implementación

### Backend

- [ ] **B1**: Crear `ProVideoRenderer` en `packages/media/src/renderers/pro-video-renderer.ts`
  - Renderizado FFmpeg profesional con: transiciones, text overlays, subtítulos burn-in
  - Ken Burns effect en imágenes, crossfade transitions
  - Mezcla de audio (TTS + música de fondo al 25% de volumen)
  - Subtítulos SRT quemados en el video (estilo profesional)
- [ ] **B2**: Crear `VideoCompositorService` en `apps/api/src/video/video-compositor.service.ts`
  - Método `renderCompositorVideo(params)` → procesa imágenes, TTS, música, subtítulos, renderiza
  - Integra EdgeTTS para narración
  - Integra KieMusicAdapter para música de fondo (+3 créditos)
  - Genera SRT para subtítulos sincronizados con TTS
  - Modo producto: overlay de logo + precio + CTA
- [ ] **B3**: Crear endpoint `POST /videos/render-compositor` en el controller
  - Acepta: imageIds[], prompt, voiceId, voiceSpeed, voiceTone, narrationText, enableSubtitles, enableMusic, musicStyle, aspectRatio, mode, productName, productPrice, productCta, logoId, productImageId
  - Validación: máx 60s, máx 10 imágenes
  - Consume 3 créditos (+ 3 si música)
- [ ] **B4**: Crear endpoint `POST /videos/render-kie` en el controller
  - Acepta: prompt, duration (5|10), aspectRatio
  - Consume 20 créditos
- [x] **B5**: Endpoint `GET /user-media?category=LOGO|PRODUCT` (ya existe)

### Frontend

- [x] **F1**: Rediseñar `video-pipeline/page.tsx` con dos pestañas/opciones
- [x] **F2**: Opción 1 — Formulario Compositor:
  - Selector de tipo (General / Producto)
  - Zona de imágenes: seleccionar de biblioteca (UserMediaPicker, hasta 10)
  - Panel TTS: texto narración, voz (8 voces ES), velocidad
  - Toggle subtítulos
  - Toggle música + selector de estilo (5 estilos)
  - Selector aspect ratio (9:16, 16:9, 1:1)
  - Campos producto (condicional): logo, producto, nombre, precio, CTA
- [x] **F3**: Opción 2 — Formulario Kie AI:
  - Textarea para prompt
  - Selector duración (5s / 10s)
  - Selector aspect ratio
  - Indicador "20 créditos"
- [x] **F4**: Panel de render jobs con estado en tiempo real + botón actualizar
- [x] **F5**: Selector imágenes con UserMediaPicker (filtrable por categoría)

### Infraestructura

- [x] **I1**: FFmpeg ya está instalado en el Dockerfile de API (alpine + ffmpeg)
- [ ] **I2**: Verificar que el contenedor tiene espacio suficiente en /tmp para renderizado

---

## 💰 Resumen de Créditos

| Acción | Créditos |
|--------|----------|
| Compositor Video (base) | 3 |
| + Música de fondo (Suno) | +3 |
| Kie AI Video (Kling 2.6) | 20 |

---

## 📊 Estado de Implementación

| # | Tarea | Estado |
|---|-------|--------|
| B1 | ProVideoRenderer (FFmpeg) | ✅ Completo |
| B2 | VideoCompositorService | ✅ Completo |
| B3 | Endpoint render-compositor | ✅ Completo |
| B4 | Endpoint render-kie | ✅ Completo |
| B5 | API media por categoría | ✅ Ya existe |
| F1 | Rediseño frontend | ✅ Completo |
| F2 | Formulario Compositor | ✅ Completo |
| F3 | Formulario Kie AI | ✅ Completo |
| F4 | Panel render jobs | ✅ Completo |
| F5 | Selector imágenes | ✅ Completo |
| I1 | FFmpeg en Docker | ✅ Ya existe |
| I2 | Espacio /tmp para render | ⬜ Verificar en deploy |
