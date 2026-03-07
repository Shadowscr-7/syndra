# ============================================================
# AUTOMATISMOS — Script de instalación completa
# ============================================================
# Ejecutar en PowerShell como Administrador (si es necesario)
#
#   .\SETUP.ps1
#
# Prerequisitos que este script verifica/instala:
#   - Node.js >= 20
#   - Docker Desktop (para PostgreSQL)
#   - npm (viene con Node)
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTOMATISMOS — Instalacion Completa  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verificar Node.js ─────────────────────────────────
Write-Host "[1/8] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = (node -v 2>&1).ToString().TrimStart('v')
    $major = [int]($nodeVersion.Split('.')[0])
    if ($major -lt 20) {
        Write-Host "  ERROR: Se requiere Node.js >= 20. Tienes v$nodeVersion" -ForegroundColor Red
        Write-Host "  Descarga de: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: Node.js v$nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js no encontrado. Instala desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# ── 2. Verificar npm ─────────────────────────────────────
Write-Host "[2/8] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = (npm -v 2>&1).ToString()
    Write-Host "  OK: npm v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: npm no encontrado" -ForegroundColor Red
    exit 1
}

# ── 3. Verificar Docker ──────────────────────────────────
Write-Host "[3/8] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = (docker --version 2>&1).ToString()
    Write-Host "  OK: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ADVERTENCIA: Docker no encontrado." -ForegroundColor DarkYellow
    Write-Host "  Descarga Docker Desktop de: https://www.docker.com/products/docker-desktop/" -ForegroundColor DarkYellow
    Write-Host "  Sin Docker, tendras que configurar PostgreSQL manualmente." -ForegroundColor DarkYellow
    Write-Host ""
    $continuar = Read-Host "  Continuar sin Docker? (s/n)"
    if ($continuar -ne "s") { exit 1 }
}

# ── 4. Instalar dependencias npm ─────────────────────────
Write-Host "[4/8] Instalando dependencias npm..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Reintentando con --legacy-peer-deps..." -ForegroundColor DarkYellow
    npm install --legacy-peer-deps 2>&1 | Out-Null
}
Write-Host "  OK: Dependencias instaladas" -ForegroundColor Green

# ── 5. Generar Prisma Client ─────────────────────────────
Write-Host "[5/8] Generando Prisma Client..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
npm exec --workspace=packages/db -- prisma generate 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Write-Host "  OK: Prisma Client generado" -ForegroundColor Green

# ── 6. Crear archivo .env ────────────────────────────────
Write-Host "[6/8] Configurando variables de entorno..." -ForegroundColor Yellow

$envFile = Join-Path $ProjectRoot ".env"
$envWebFile = Join-Path $ProjectRoot "apps\web\.env"

if (-not (Test-Path $envFile)) {
    @"
# ============================================================
# AUTOMATISMOS — Variables de entorno
# ============================================================

# ====== PostgreSQL ======
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=automatismos
DB_PORT=5434

DATABASE_URL=postgresql://postgres:postgres@localhost:5434/automatismos

# ====== Puertos ======
API_PORT=3001
WEB_PORT=3002

# ====== LLM (OpenAI / compatible) ======
LLM_API_KEY=
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# ====== Meta (Instagram / Facebook) ======
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_IG_USER_ID=
META_FB_PAGE_ID=

# ====== Cloudinary ======
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ====== Telegram ======
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ====== HeyGen / ElevenLabs (Video IA) ======
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=

NODE_ENV=development
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "  OK: .env creado (edita los valores que necesites)" -ForegroundColor Green
} else {
    Write-Host "  OK: .env ya existe" -ForegroundColor Green
}

if (-not (Test-Path $envWebFile)) {
    "DATABASE_URL=postgresql://postgres:postgres@localhost:5434/automatismos" | Out-File -FilePath $envWebFile -Encoding UTF8
    Write-Host "  OK: apps/web/.env creado" -ForegroundColor Green
}

# ── 7. Levantar PostgreSQL con Docker ────────────────────
Write-Host "[7/8] Levantando PostgreSQL con Docker..." -ForegroundColor Yellow
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        # Usar docker-compose pero forzar puerto 5434 externo
        docker run -d `
            --name automatismos-db `
            -e POSTGRES_USER=postgres `
            -e POSTGRES_PASSWORD=postgres `
            -e POSTGRES_DB=automatismos `
            -p 5434:5432 `
            --restart unless-stopped `
            postgres:16-alpine 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            # El container ya puede existir
            docker start automatismos-db 2>&1 | Out-Null
        }

        Write-Host "  Esperando a que PostgreSQL este listo..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds 5

        # Verificar conexion
        $ready = $false
        for ($i = 0; $i -lt 10; $i++) {
            $check = netstat -ano 2>$null | Select-String ":5434" | Select-String "LISTEN"
            if ($check) { $ready = $true; break }
            Start-Sleep -Seconds 2
        }

        if ($ready) {
            Write-Host "  OK: PostgreSQL corriendo en puerto 5434" -ForegroundColor Green
        } else {
            Write-Host "  ADVERTENCIA: PostgreSQL puede no estar listo aun" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  ADVERTENCIA: Docker no esta corriendo. Inicia Docker Desktop primero." -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "  ADVERTENCIA: No se pudo iniciar Docker. Hazlo manualmente." -ForegroundColor DarkYellow
}

# ── 8. Sincronizar esquema de base de datos ──────────────
Write-Host "[8/8] Sincronizando esquema de base de datos..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/automatismos"
$ErrorActionPreference = "Continue"
npm exec --workspace=packages/db -- prisma db push --skip-generate 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Esquema sincronizado" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se pudo sincronizar (la DB puede no estar lista)" -ForegroundColor DarkYellow
    Write-Host "  Ejecuta manualmente despues:" -ForegroundColor DarkYellow
    Write-Host '  $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/automatismos"' -ForegroundColor Gray
    Write-Host '  npm exec --workspace=packages/db -- prisma db push' -ForegroundColor Gray
}

# ── Resumen final ────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para iniciar el sistema:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Asegurate de que Docker Desktop este corriendo" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Iniciar la API (NestJS):" -ForegroundColor Gray
Write-Host '     cd apps/api' -ForegroundColor DarkCyan
Write-Host '     $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/automatismos"' -ForegroundColor DarkCyan
Write-Host '     npx nest start --builder webpack' -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  3. Iniciar el Panel Web (Next.js) en otra terminal:" -ForegroundColor Gray
Write-Host '     cd apps/web' -ForegroundColor DarkCyan
Write-Host '     npx next dev --port 3002' -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  4. Abrir en el navegador:" -ForegroundColor Gray
Write-Host "     http://localhost:3002" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Puertos:" -ForegroundColor White
Write-Host "     PostgreSQL  -> localhost:5434" -ForegroundColor Gray
Write-Host "     API NestJS  -> localhost:3001" -ForegroundColor Gray
Write-Host "     Web Next.js -> localhost:3002" -ForegroundColor Gray
Write-Host ""
Write-Host "  Edita .env para configurar APIs externas (OpenAI, Meta, etc.)" -ForegroundColor DarkYellow
Write-Host ""
