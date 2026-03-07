#!/usr/bin/env bash
# ============================================================
# AUTOMATISMOS — Script de instalación completa (macOS/Linux)
# ============================================================
# Ejecutar:  chmod +x setup.sh && ./setup.sh
# ============================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  AUTOMATISMOS — Instalación Completa   "
echo "========================================"
echo ""

# ── 1. Verificar Node.js ─────────────────────────────────
echo "[1/8] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js no encontrado. Instala desde https://nodejs.org/"
    exit 1
fi
NODE_V=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_V" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "  ERROR: Se requiere Node.js >= 20. Tienes v$NODE_V"
    exit 1
fi
echo "  OK: Node.js v$NODE_V"

# ── 2. Verificar npm ─────────────────────────────────────
echo "[2/8] Verificando npm..."
NPM_V=$(npm -v 2>/dev/null || echo "")
if [ -z "$NPM_V" ]; then
    echo "  ERROR: npm no encontrado"
    exit 1
fi
echo "  OK: npm v$NPM_V"

# ── 3. Verificar Docker ──────────────────────────────────
echo "[3/8] Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_V=$(docker --version 2>/dev/null || echo "no disponible")
    echo "  OK: $DOCKER_V"
else
    echo "  ADVERTENCIA: Docker no encontrado."
    echo "  Descarga Docker Desktop de: https://www.docker.com/products/docker-desktop/"
    echo "  Sin Docker, tendrás que configurar PostgreSQL manualmente."
    read -p "  Continuar sin Docker? (s/n) " -r
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then exit 1; fi
fi

# ── 4. Instalar dependencias npm ─────────────────────────
echo "[4/8] Instalando dependencias npm..."
npm install 2>&1 || npm install --legacy-peer-deps 2>&1
echo "  OK: Dependencias instaladas"

# ── 5. Generar Prisma Client ─────────────────────────────
echo "[5/8] Generando Prisma Client..."
npm exec --workspace=packages/db -- prisma generate 2>&1
echo "  OK: Prisma Client generado"

# ── 6. Crear archivo .env ────────────────────────────────
echo "[6/8] Configurando variables de entorno..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    cat > "$PROJECT_ROOT/.env" << 'ENVEOF'
# ============================================================
# AUTOMATISMOS — Variables de entorno
# ============================================================

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=automatismos
DB_PORT=5434

DATABASE_URL=postgresql://postgres:postgres@localhost:5434/automatismos

API_PORT=3001
WEB_PORT=3002

LLM_API_KEY=
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

NODE_ENV=development
ENVEOF
    echo "  OK: .env creado"
else
    echo "  OK: .env ya existe"
fi

if [ ! -f "$PROJECT_ROOT/apps/web/.env" ]; then
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5434/automatismos" > "$PROJECT_ROOT/apps/web/.env"
    echo "  OK: apps/web/.env creado"
fi

# ── 7. Levantar PostgreSQL con Docker ────────────────────
echo "[7/8] Levantando PostgreSQL con Docker..."
if command -v docker &> /dev/null && docker info &> /dev/null; then
    docker run -d \
        --name automatismos-db \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=automatismos \
        -p 5434:5432 \
        --restart unless-stopped \
        postgres:16-alpine 2>/dev/null || docker start automatismos-db 2>/dev/null || true

    echo "  Esperando a que PostgreSQL esté listo..."
    sleep 5
    echo "  OK: PostgreSQL corriendo en puerto 5434"
else
    echo "  ADVERTENCIA: Docker no disponible. Configura PostgreSQL manualmente."
fi

# ── 8. Sincronizar esquema de base de datos ──────────────
echo "[8/8] Sincronizando esquema de base de datos..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/automatismos"
npm exec --workspace=packages/db -- prisma db push --skip-generate 2>&1 || {
    echo "  ADVERTENCIA: No se pudo sincronizar. Ejecuta manualmente:"
    echo '  export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/automatismos"'
    echo '  npm exec --workspace=packages/db -- prisma db push'
}

# ── Resumen final ────────────────────────────────────────
echo ""
echo "========================================"
echo "  INSTALACIÓN COMPLETADA"
echo "========================================"
echo ""
echo "  Para iniciar el sistema:"
echo ""
echo "  1. Asegurate de que Docker Desktop esté corriendo"
echo ""
echo "  2. Iniciar la API (NestJS):"
echo '     cd apps/api'
echo '     DATABASE_URL="postgresql://postgres:postgres@localhost:5434/automatismos" npx nest start --builder webpack'
echo ""
echo "  3. Iniciar el Panel Web (Next.js) en otra terminal:"
echo '     cd apps/web'
echo '     npx next dev --port 3002'
echo ""
echo "  4. Abrir en el navegador:"
echo "     http://localhost:3002"
echo ""
echo "  Puertos:"
echo "     PostgreSQL  -> localhost:5434"
echo "     API NestJS  -> localhost:3001"
echo "     Web Next.js -> localhost:3002"
echo ""
echo "  Edita .env para configurar APIs externas (OpenAI, Meta, etc.)"
echo ""
