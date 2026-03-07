#!/bin/bash
# ============================================================
# deploy.sh — Despliegue completo en un servidor Linux
# ============================================================
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Pre-requisitos:
#   - Docker + Docker Compose instalados
#   - Archivo .env configurado (copia de .env.example)
# ============================================================

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}🚀 Automatismos — Deploy${NC}"
echo "========================================"

# 1. Verificar dependencias
echo -e "\n${YELLOW}[1/5]${NC} Verificando dependencias..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "   Instalar: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está disponible${NC}"
    exit 1
fi

echo -e "   ✅ Docker $(docker --version | cut -d' ' -f3)"
echo -e "   ✅ Docker Compose $(docker compose version --short)"

# 2. Verificar .env
echo -e "\n${YELLOW}[2/5]${NC} Verificando configuración..."

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No se encontró .env — creando desde .env.example${NC}"
    cp .env.example .env
    echo -e "   📝 Edita .env con tus API keys: ${BOLD}nano .env${NC}"
    echo -e "   Luego vuelve a ejecutar: ${BOLD}./deploy.sh${NC}"
    exit 0
fi

echo -e "   ✅ .env encontrado"

# 3. Build
echo -e "\n${YELLOW}[3/5]${NC} Construyendo imágenes Docker..."
docker compose build --parallel

# 4. Levantar servicios
echo -e "\n${YELLOW}[4/5]${NC} Levantando servicios..."
docker compose up -d

# 5. Esperar a que todo esté listo
echo -e "\n${YELLOW}[5/5]${NC} Esperando a que los servicios estén listos..."

# Esperar a la API (max 60s)
echo -n "   API: "
TRIES=0
until curl -sf http://localhost:${API_PORT:-3001}/api/health > /dev/null 2>&1; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge 60 ]; then
        echo -e "${RED}TIMEOUT${NC}"
        echo "   Revisa: docker compose logs api"
        break
    fi
    echo -n "."
    sleep 2
done
if [ "$TRIES" -lt 60 ]; then
    echo -e " ${GREEN}✅${NC}"
fi

# Esperar al Web (max 30s)
echo -n "   Web: "
TRIES=0
until curl -sf http://localhost:${WEB_PORT:-3002} > /dev/null 2>&1; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge 30 ]; then
        echo -e "${RED}TIMEOUT${NC}"
        echo "   Revisa: docker compose logs web"
        break
    fi
    echo -n "."
    sleep 2
done
if [ "$TRIES" -lt 30 ]; then
    echo -e " ${GREEN}✅${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Automatismos desplegado${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "   🌐 Panel:    ${BOLD}http://localhost:${WEB_PORT:-3002}${NC}"
echo -e "   🔌 API:      ${BOLD}http://localhost:${API_PORT:-3001}${NC}"
echo -e "   🐘 PostgreSQL: localhost:${DB_PORT:-5432}"
echo ""
echo -e "   📋 Logs:     ${BOLD}docker compose logs -f${NC}"
echo -e "   🛑 Parar:    ${BOLD}docker compose down${NC}"
echo -e "   🔄 Rebuild:  ${BOLD}docker compose up -d --build${NC}"
echo ""
