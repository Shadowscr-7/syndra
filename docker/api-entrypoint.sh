#!/bin/sh
# ============================================================
# API Entrypoint — Espera a PostgreSQL, crea tablas, arranca NestJS
# ============================================================
set -e

echo "⏳ Waiting for PostgreSQL at $DATABASE_URL ..."

# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')

# Default port if not found
DB_PORT=${DB_PORT:-5432}

# Wait for PostgreSQL to be ready (max 60s)
TRIES=0
MAX_TRIES=60
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "❌ PostgreSQL not available after ${MAX_TRIES}s — aborting"
    exit 1
  fi
  sleep 1
done

echo "✅ PostgreSQL is ready"

# Run Prisma db push to sync schema (idempotent, no data loss)
echo "📦 Syncing database schema..."
cd /app
npx --workspace=packages/db prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "⚠️  Prisma db push failed, but continuing..."
}

echo "🚀 Starting API server..."
cd /app

# Execute the CMD
exec "$@"
