# Remotion Video Pipeline — Plan de Mejoras por Fases

> Cada fase se implementa, se verifica y se commitea antes de pasar a la siguiente.

---

## Fase 1: Storyboard + Roles de Imágenes ✅
**Objetivo:** Permitir al usuario asignar roles, orden y duración a cada imagen.

### Backend
- [x] Actualizar `CompositorInput` — nuevo campo `imageSlides[]` con: `{ mediaId, url, role, order, durationMs, animation, caption }`
- [x] Roles: `slide` | `logo` | `product` | `intro` | `outro` | `background`
- [x] Animaciones: `ken-burns-in` | `ken-burns-out` | `pan-left` | `pan-right` | `zoom-pulse` | `none` | `auto`
- [x] El compositor ordena por `order`, aplica logo como overlay fijo, usa durations custom
- [x] Actualizar `RemotionRenderInput` para aceptar slides tipados (`ImageSlideInput`)
- [x] Actualizar `VideoComposition.tsx` — storyboard slides, per-slide animations, captions, logo watermark, subtitle styles
- [x] Actualizar `Root.tsx` — defaultProps actualizados a `slides[]`
- [x] `normalizeSlides()` — backwards compatible con `images[]` flat

### Frontend
- [x] Toggle "Storyboard" en image picker cuando hay imágenes seleccionadas
- [x] Cada imagen muestra: rol (dropdown), orden (arrows), duración (segundos), animación, caption
- [x] Selector de estilo de subtítulos: Píldora / Minimal
- [x] Submit envía `imageSlides[]` al backend en modo storyboard

### Verificación
- [x] TypeScript compila sin errores (media, api, web)
- [x] Backend acepta tanto `imageIds[]` (legacy) como `imageSlides[]` (storyboard)

---

## Fase 2: Video Presets / Templates ✅
**Objetivo:** Presets con 1 click que configuran todo automáticamente.

### Backend
- [x] Nuevo archivo `video-presets.ts` con 6 presets predefinidos
- [x] Cada preset define: slideRoles, música, estilo subtítulos, animaciones, placeholder narración, intent
- [x] Endpoint `GET /videos/compositor/presets` para listar presets

### Presets
- [x] **Reel de Producto**: logo → problema → producto → features → CTA+precio
- [x] **Story Educativa**: título → datos → conclusión → CTA
- [x] **Hook + Desarrollo**: gancho fuerte → desarrollo → CTA
- [x] **Before/After**: antes → transición → después → CTA
- [x] **Testimonial**: quote → producto → rating → CTA
- [x] **Storytelling**: intro emocional → desarrollo → clímax → resolución → CTA

### Frontend
- [x] Sección "Presets Rápidos" con cards visuales antes del formulario
- [x] Al seleccionar preset: auto-llena narración, estilo musical, subtítulos, activa storyboard
- [x] Badge con descripción de cada preset

### Verificación
- [x] TypeScript compila sin errores

---

## Fase 3: Composiciones Remotion Avanzadas ✅
**Objetivo:** Más efectos visuales profesionales aprovechando React.

### Estilos de subtítulos
- [x] `pill`: fondo redondeado animado (estilo actual mejorado)
- [x] `minimal`: texto limpio sin fondo, fade in/out
- [x] `word-by-word`: cada palabra aparece individual con highlight (estilo CapCut)
- [x] `karaoke`: texto base con highlight progresivo dorado

### Componentes visuales
- [x] `SlideCaption`: texto overlay por slide con fade-in + slide-up
- [x] `LogoWatermark`: logo semi-transparente fijo en esquina superior derecha
- [x] `ProductOverlay`: nombre + precio + CTA animados sobre el video
- [x] `CrossfadeSlide`: transiciones crossfade entre slides con duración configurable
- [x] `ANIMATION_PRESETS`: 6 presets de animación por slide (ken-burns, pan, zoom, etc.)

### Frontend
- [x] Selector de estilo de subtítulos ampliado: Píldora, Minimal, Palabra×Palabra, Karaoke

### Verificación
- [x] TypeScript compila sin errores en los 3 paquetes

---

## Fase 4: Piper TTS — Voces Más Naturales ✅
**Objetivo:** Reemplazar/complementar Edge TTS con Piper (offline, gratis, mejor calidad).

### Backend
- [x] Nuevo adapter `PiperTTSAdapter` en `packages/media/src/adapters/piper-tts.ts`
- [x] Implementa interfaz `VoiceSynthesisAdapter`
- [x] Genera audio WAV → convierte a MP3 con ffmpeg
- [x] Genera VTT estimado basado en conteo de palabras
- [x] `PiperTTSAdapter.isAvailable()` para verificar disponibilidad
- [x] Exportado desde `@automatismos/media`

### Integración
- [x] `VideoCompositorService` elige Piper vs Edge según `voiceEngine`
- [x] Nuevo campo `voiceEngine: 'edge' | 'piper'` en CompositorInput
- [x] Fallback: si Piper falla → Edge TTS automáticamente

### Frontend
- [x] Selector de motor de voz: Edge TTS / Piper (Natural)
- [x] Grid de narración ampliado a 4 columnas
- [x] Se envía `voiceEngine` en el submit

### Dockerfile
- [x] Descarga Piper binario (x86_64)
- [x] Descarga modelo español `es_ES-sharvard-medium` (~60MB)
- [x] Variables de entorno: `PIPER_BIN`, `PIPER_MODELS_DIR`

### Verificación
- [x] TypeScript compila sin errores en los 3 paquetes

---

## Fase 5: Generador de Guión con IA ✅
**Objetivo:** Dado un tema/producto, genera guión + sugerencias de imágenes + música automáticamente.

### Backend
- [x] Nuevo endpoint `POST /videos/compositor/generate-script`
- [x] Input: `{ topic, intent, targetPlatform, duration, language, productInfo? }`
- [x] Output: `{ narration, imagePrompts[], musicStyle, subtitleStyle, preset }`
- [x] Prompt de sistema optimizado para cada plataforma (Reels, TikTok, Stories, YouTube Shorts)
- [x] Incluye hooks optimizados, CTAs, y estructura narrativa

### Prompts por plataforma
- [x] **Reels/TikTok**: Hook en primeros 3s, ritmo rápido, CTA final
- [x] **Stories**: Más personal, preguntas, swipe-up CTA
- [x] **YouTube Shorts**: Educativo, valor rápido, suscribirse CTA

### Frontend
- [x] Botón "✨ Generar guión completo con IA" arriba del formulario
- [x] Panel expandible para ingresar: tema, intención, plataforma, duración, idioma
- [x] Info de producto opcional (nombre, precio, features)
- [x] Al generar: auto-llena narración, crea prompts de imágenes, sugiere música y subtítulos
- [x] Activa storyboard automáticamente

### Verificación
- [x] TypeScript compila sin errores en los 3 paquetes

---

## Estado de Progreso

| Fase | Estado | Commit |
|---|---|---|
| 1. Storyboard + Roles | ✅ Completada | pendiente commit |
| 2. Video Presets | ✅ Completada | pendiente commit |
| 3. Composiciones Avanzadas | ✅ Completada | pendiente commit |
| 4. Piper TTS | ✅ Completada | pendiente commit |
| 5. Generador de Guión IA | ✅ Completada | pendiente commit |
