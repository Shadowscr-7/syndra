# Canva Integration — Syndra & Claude Code

## 1. Claude Code + Canva via MCP (uso personal / desarrollo)

Canva lanzó un MCP server oficial en enero 2026 que permite a Claude Code interactuar
directamente con tu workspace de Canva desde la terminal.

### Setup

**Opción A — Canva oficial:**
```bash
claude mcp add canva
```
Te pedirá autenticar con tu cuenta de Canva (OAuth).

**Opción B — Vía Composio** (más fácil):
```bash
claude mcp add --provider composio canva
```

### Qué podés hacer

- Crear diseños (Stories 9:16, Reels 9:16, Posts 1:1, presentaciones) con lenguaje natural
- Usar tu **Brand Kit** de Canva (colores, fuentes, logo) automáticamente
- Rellenar templates existentes con contenido generado por Claude
- Redimensionar un diseño a múltiples formatos en un solo paso
- Exportar y compartir directamente desde la conversación

### Ejemplos de prompts

```
"Armame 5 Stories para Instagram sobre lanzamiento de producto,
usando mi Brand Kit, formato 1080x1920, estilo minimalista"

"Tomá este copy y creá un Reel de 9:16 con el template de mi
workspace llamado 'Reel Promo'"

"Redimensioná el diseño [ID] a formato Story, Post cuadrado y Banner"
```

### Referencias
- [Canva AI Connector — Newsroom](https://www.canva.com/newsroom/news/claude-ai-connector/)
- [Canva MCP — Documentación oficial](https://www.canva.dev/docs/apps/mcp-server/)
- [Acciones disponibles en MCP](https://www.canva.com/help/mcp-canva-usage/)
- [Composio — Canva + Claude Code](https://composio.dev/toolkits/canva/framework/claude-code)

---

## 2. Canva integrado en Syndra (para usuarios de la plataforma)

Integrar Canva en el pipeline editorial de Syndra para que los usuarios puedan generar
sus assets directamente en Canva en vez de (o además de) Sharp/Remotion.

### Arquitectura

#### Nivel 1 — Canva como generador de assets

Reemplaza o complementa el Sharp composer en el stage `MEDIA` del pipeline:

```
CONTENT → MEDIA
  → CanvaAdapter.createDesign(brief, templateId)
  → Canva Connect API genera el diseño
  → CanvaAdapter.exportDesign(designId) → URL imagen
  → Se guarda como MediaAsset
  → Continúa: COMPLIANCE → REVIEW → Telegram → PUBLISH
```

#### Nivel 2 — Canva como editor colaborativo

Agrega una capa de edición humana antes de aprobar:

```
MEDIA (Canva genera el diseño)
  → Telegram envía link editable al usuario
  → Usuario abre Canva, ajusta lo que quiere
  → Aprueba desde Telegram
  → Syndra exporta la versión final y publica
```

### Dónde vive en el código

```
packages/media/src/adapters/canva.adapter.ts      ← Adapter principal
packages/media/src/composers/canva-renderer.ts    ← Lógica de creación/export
apps/api/src/credentials/                         ← Agregar CANVA como CredentialType
apps/web/src/app/dashboard/credentials/           ← Botón "Conectar Canva" (OAuth)
```

### Flujo OAuth (igual que Meta)

1. Usuario va a `/dashboard/credentials`
2. Hace clic en "Conectar Canva"
3. Redirige a Canva OAuth → autoriza acceso al workspace
4. Token se guarda en `ApiCredential` (AES-256-GCM encriptado) asociado al workspace
5. El pipeline usa el token para crear diseños en nombre del usuario

### API que se usa — Canva Connect API

| Operación | Endpoint |
|-----------|----------|
| Crear diseño desde template | `POST /v1/designs` |
| Obtener diseño | `GET /v1/designs/{designId}` |
| Exportar como imagen | `POST /v1/exports` |
| Listar templates del workspace | `GET /v1/brand-templates` |
| Obtener Brand Kit | `GET /v1/brand-kits` |

### Limitación importante

La Canva Connect API requiere que la aplicación sea **aprobada por Canva** a través
de su portal de developers. El proceso es similar al de Meta:

1. Registrar la app en [developers.canva.com](https://www.canva.dev)
2. Describir el caso de uso (automatización de contenido para redes sociales)
3. Esperar revisión y aprobación
4. Recibir `Client ID` y `Client Secret`

Sin aprobación no hay acceso a la API de producción.

### Plan de implementación (una vez aprobada la app)

1. **OAuth flow** — Controlador + proxy route, igual que `credentials/meta`
2. **CanvaAdapter** — Implementa la interfaz `ImageComposer` existente
3. **Template selector** — UI para que el usuario elija templates de su workspace
4. **Pipeline hook** — En `MediaEngineService`, agregar Canva como opción de renderer
5. **Telegram link** — Para Nivel 2, enviar link editable en el mensaje de revisión

### Coexistencia con Sharp/Remotion

Canva no reemplaza a Sharp ni Remotion, coexisten como opciones:

| Renderer | Cuándo usarlo |
|----------|---------------|
| Sharp | Assets rápidos, sin cuenta Canva requerida, plantillas internas |
| Remotion | Videos con narración, subtítulos, música |
| Canva | Diseños on-brand de alta calidad, edición colaborativa, Brand Kit del usuario |

El usuario puede configurar el renderer preferido por workspace o por tipo de contenido.
