# Automatismos — Guía de Instalación Rápida

## Requisitos previos

- **Node.js** >= 20 ([descargar](https://nodejs.org/))
- **Docker Desktop** ([descargar](https://www.docker.com/products/docker-desktop/))
- **Visual Studio Code** ([descargar](https://code.visualstudio.com/))

### Extensiones recomendadas de VS Code

- Prisma (`Prisma.prisma`)
- ESLint (`dbaeumer.vscode-eslint`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Docker (`ms-azuretools.vscode-docker`)

---

## Instalación Automática

### Windows (PowerShell)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\SETUP.ps1
```

### macOS / Linux (Bash)

```bash
chmod +x setup.sh
./setup.sh
```

---

## Instalación Manual

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Generar Prisma Client:**
   ```bash
   npm exec --workspace=packages/db -- prisma generate
   ```

3. **Crear archivo `.env`** (copiar de `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Asegúrate de que `DATABASE_URL` sea:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5434/automatismos
   ```
   Crea también `apps/web/.env` con la misma variable.

4. **Levantar PostgreSQL:**
   ```bash
   docker run -d --name automatismos-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=automatismos \
     -p 5434:5432 \
     --restart unless-stopped \
     postgres:16-alpine
   ```

5. **Sincronizar esquema de BD:**
   ```bash
   npm exec --workspace=packages/db -- prisma db push --skip-generate
   ```

---

## Iniciar el Sistema

Abre **3 terminales** en VS Code (`Ctrl + ñ`):

### Terminal 1 — API (NestJS):
```bash
npm run dev:api
```

### Terminal 2 — Panel Web (Next.js):
```bash
npm run dev:web
```

### Terminal 3 — (Opcional) Prisma Studio:
```bash
npm run db:studio
```

---

## URLs

| Servicio      | URL                          |
|---------------|------------------------------|
| Panel Web     | http://localhost:3002         |
| API           | http://localhost:3001/api     |
| Prisma Studio | http://localhost:5555         |
| PostgreSQL    | localhost:5434                |

---

## Estructura del Proyecto

```
automatismos/
├── apps/
│   ├── api/          → NestJS 11 (Backend API)
│   └── web/          → Next.js 15 (Panel de Control)
├── packages/
│   ├── db/           → Prisma schema + client
│   ├── shared/       → Tipos y utils compartidos
│   ├── eslint-config/→ Config ESLint compartida
│   └── tsconfig/     → Config TypeScript base
├── docker/           → Dockerfiles
├── docker-compose.yml
├── SETUP.ps1         → Script instalación Windows
├── setup.sh          → Script instalación macOS/Linux
└── PLAN_MAESTRO.md   → Especificación completa
```

---

## Solución de Problemas

### "Can't reach database server"
- Asegúrate de que Docker Desktop está corriendo
- Verifica que el contenedor existe: `docker ps -a | grep automatismos-db`
- Si no existe, créalo con el comando del paso 4

### Estilos/CSS no se ven
- Verifica que `apps/web/src/app/globals.css` contiene la línea:
  ```css
  @source "../../src/**/*.{ts,tsx}";
  ```
- Reinicia el servidor dev: `Ctrl+C` y `npm run dev:web`

### Puerto ya en uso
- Busca el proceso: `netstat -ano | findstr :3002` (Windows)
- Mátalo: `Stop-Process -Id <PID>` (PowerShell) o `kill <PID>` (Bash)
