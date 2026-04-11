# Avatar Scene Engine — Arquitectura y Roadmap

## Qué es

Sistema de generación de video que combina avatares IA con escenas cinemáticas generadas por texto. Permite crear videos donde un avatar habla mientras el fondo cambia según el contenido de cada segmento del guión.

Hay dos modos de uso:
- **Manual**: el usuario define el guión y las escenas (asistido por IA)
- **Automático**: la IA toma el copy de un editorial run y genera todo (usuario solo elige avatar)

---

## Storyboard: la unidad central

Todo el sistema gira alrededor del concepto de **storyboard segmentado**. Cada segmento representa un momento del video donde el avatar dice algo específico y el fondo refleja ese contenido.

```typescript
interface AvatarSceneStoryboard {
  avatarId: string;          // HeyGen stock avatar ID
  voiceId?: string;          // HeyGen voice ID (español por defecto)
  aspectRatio: '9:16' | '16:9' | '1:1';
  compositeMode: 'overlay' | 'split' | 'full';
  overallMood: string;       // "energético" | "profesional" | "emotivo" etc.
  musicStyle?: 'upbeat' | 'calm' | 'corporate' | 'energetic' | 'cinematic';
  segments: AvatarSceneSegment[];
}

interface AvatarSceneSegment {
  order: number;
  text: string;              // Qué dice el avatar
  durationSeconds: number;   // Estimado por palabras (~150 palabras/min)
  scenePrompt: string;       // Prompt de Kling para la escena de fondo
  sceneStyle?: string;       // "cinematic" | "realistic" | "abstract"
  transition: 'cut' | 'dissolve' | 'fade';
}
```

---

## Flujo de generación

```
POST /api/videos/avatar-scene/render
          │
          ▼
   AvatarSceneService
          │
    ┌─────┴──────┐
    │ (paralelo) │
    ▼            ▼
HeyGen API    KieVideoAdapter×N
avatar full   (una escena Kling
video con     por segmento, 5s
fondo verde   o 10s cada una)
#00FF00
    │            │
    └─────┬──────┘
          ▼
   AvatarSceneRenderer (FFmpeg)
   ├── Download ambos a /tmp
   ├── Concatenar escenas Kling con xfade
   │   (duración total = duración avatar)
   ├── Chroma key: remove green del avatar
   └── Overlay avatar sobre escenas
          │
          ▼
   Cloudinary → MediaAsset
```

### Modos de composición

| Modo | Descripción | Uso recomendado |
|------|-------------|-----------------|
| `overlay` | Avatar en esquina inferior (30% tamaño), escena completa de fondo | Estilo noticiario, noticias, educativo |
| `split` | Avatar en mitad izquierda, escena en mitad derecha | Presentaciones, demos |
| `full` | Avatar pantalla completa con chroma key sobre escena | Estilo influencer, storytelling |

---

## Endpoints

### `POST /api/videos/avatar-scene/storyboard`
Genera un storyboard desde texto libre o desde un editorial run. No renderiza nada.

```json
// Request (modo libre)
{
  "topic": "Lanzamiento de nuestro nuevo producto X",
  "intent": "generar expectativa y llevar a registro",
  "platform": "reels",
  "tone": "energético",
  "durationTarget": 30
}

// Request (desde editorial run)
{
  "editorialRunId": "run_xxx",
  "platform": "reels"
}

// Response
{
  "storyboard": {
    "compositeMode": "overlay",
    "overallMood": "energético y aspiracional",
    "musicStyle": "upbeat",
    "segments": [
      {
        "order": 0,
        "text": "¿Cansado de perder tiempo en tareas repetitivas?",
        "durationSeconds": 4,
        "scenePrompt": "Modern office, worker looking frustrated at screen, warm moody lighting, cinematic",
        "transition": "cut"
      },
      ...
    ]
  }
}
```

### `POST /api/videos/avatar-scene/render`
Toma un storyboard y lo renderiza.

```json
{
  "workspaceId": "ws_xxx",
  "avatarId": "Anna_public_3_20240108",
  "voiceId": "1bd001e7e50f421d891986aad5c1e6ea",
  "storyboard": { /* AvatarSceneStoryboard */ }
}
```

### `GET /api/videos/avatar-scene/avatars`
Lista de avatares disponibles en HeyGen.

---

## Créditos

| Operación | Créditos |
|-----------|----------|
| Avatar video (HeyGen) | 15 |
| Escena Kling (por segmento) | 8 |
| Música (Suno/Kie) | 3 |
| **Total típico (3 segmentos)** | **42** |

---

## AI Director

El `AiDirectorService` es el cerebro. Usa el LLM (OpenAI/Anthropic) para generar storyboards coordinados, asegurando que:

1. **Coherencia semántica**: el prompt de cada escena refleja exactamente lo que el avatar está diciendo en ese momento
2. **Arco narrativo**: intro → desarrollo → CTA tiene progresión visual (oscuro → claro, caótico → ordenado, etc.)
3. **Tono consistente**: el mood general se mantiene en todos los segmentos
4. **Prompts en inglés**: los prompts de Kling se generan en inglés (mejor calidad) aunque el guión sea en español

### Fuentes de contexto (modo automático)

```
EditorialRun
  ├── ContentBrief (intención, audiencia, ángulo)
  ├── ContentVersion (copy final aprobado)
  ├── UserPersona (voz, tono, expertise)
  └── Campaign (industria, objetivos, marca)
```

---

## Integración con el Pipeline Editorial

Cuando un `EditorialRun` llega a estado `REVIEW`, el usuario puede:

1. **Aprobar como post** (flujo existente)
2. **Convertir a Video Avatar** (nuevo)
   - Se abre modal: seleccionar avatar
   - AI Director genera storyboard desde el copy existente
   - Usuario puede previsualizar segmentos y ajustar
   - Renderiza → `MediaAsset` vinculado al run
   - Puede publicarse como reel

En el futuro (Fase 3), el scheduler puede hacer esto automáticamente si el workspace tiene `preferVideoFormat: true`.

---

## Roadmap de Implementación

### Fase 1 — Motor base (ACTUAL)
- [x] Arquitectura diseñada
- [ ] `AiDirectorService` — genera storyboard desde copy o prompt libre
- [ ] `AvatarSceneService` — orquesta HeyGen + Kling×N
- [ ] `AvatarSceneRenderer` — FFmpeg chroma key + composite
- [ ] Endpoints: `/storyboard` y `/render`
- [ ] Actualizar `video.module.ts`

### Fase 2 — UI Manual
- [ ] Tab "Avatar + Escena" en `/dashboard/videos`
- [ ] Editor de storyboard: añadir/editar/reordenar segmentos
- [ ] Preview textual del storyboard antes de renderizar
- [ ] Selector de avatares (grid con thumbnails de HeyGen)
- [ ] Selector de modo de composición (overlay/split/full)

### Fase 3 — Integración editorial
- [ ] Botón "Hacer Video Avatar" en `editorial/[id]` (estado REVIEW)
- [ ] `AiDirectorService.fromEditorialRun(runId)` 
- [ ] Modal: solo pide avatar, genera todo lo demás
- [ ] `MediaAsset` vinculado al editorial run

### Fase 4 — Scheduler automático
- [ ] `preferVideoFormat` flag en workspace settings
- [ ] Scheduler genera video en vez de post cuando está activo
- [ ] Telegram approval incluye preview del storyboard

---

## Stack técnico

| Componente | Herramienta | Motivo |
|------------|-------------|--------|
| Avatar + lip sync | HeyGen API v2 | Mejor calidad, SDK simple |
| Escenas cinemáticas | Kling 2.6 via Kie AI | Ya integrado, buena calidad |
| Composición | FFmpeg (existente) | Ya instalado en el stack |
| Chroma key | FFmpeg `chromakey` filter | Nativo, sin dependencias extra |
| Música de fondo | Suno via Kie AI | Ya integrado |
| TTS (fallback) | Edge TTS / Piper | Para modo sin HeyGen |
| LLM (director) | OpenAI GPT-4o | Mejor para JSON estructurado |
| Storage | Cloudinary | Ya integrado |

---

## Notas de implementación

### Green screen en HeyGen
Se usa `background: { type: 'color', value: '#00FF00' }` para facilitar el chroma key en FFmpeg.
La opción `useGreenScreen: true` en `HeyGenVideoAdapter.generate()` activa este modo.

### Timing de segmentos
La estimación de duración se calcula con: `words / 150 * 60` (segundos).
HeyGen determina la duración real. El compositor ajusta las escenas Kling para que la suma coincida con el video del avatar.

### Paralelismo
HeyGen y todos los clips de Kling se generan en paralelo con `Promise.all()`.
Tiempo estimado total: ~2-4 min (limitado por HeyGen ~2min + Kling ~1-2min en paralelo).

### Créditos: consumo en dos fases
1. Al crear el job: reservar créditos (optimista)
2. Si falla: devolver créditos automáticamente
