# Syndra — Guía de Despliegue en VPS (Hostinger)

> **Última actualización:** 14 de marzo de 2026

---

## Requisitos previos

- VPS con **Ubuntu 22.04/24.04** (mínimo 2 vCPU, 8 GB RAM)
- Dominio `aivanguard.app` (o el que elijas) con acceso al panel DNS
- Repositorio de Syndra accesible (GitHub, GitLab, etc.)
- Archivo `.env` configurado (ver sección 6)

---

## 1. Configurar DNS

En el panel DNS de Hostinger (o tu proveedor de dominio), crea:

| Tipo | Nombre | Valor             | TTL  |
|------|--------|-------------------|------|
| A    | syndra | `IP_DE_TU_VPS`   | 3600 |

Espera unos minutos a que propague (puedes verificar con `ping syndra.aivanguard.app`).

---

## 2. Preparar el VPS

```bash
# Conectar por SSH
ssh root@IP_DE_TU_VPS

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose (viene incluido en Docker moderno, verifica)
docker compose version

# Instalar Git
apt install git -y
```

---

## 3. Instalar Caddy (Reverse Proxy + SSL automático)

Caddy obtiene certificados SSL de Let's Encrypt automáticamente. No necesitas nginx ni configurar certificados manualmente.

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy -y
```

---

## 4. Configurar Caddy

Edita `/etc/caddy/Caddyfile`:

```bash
nano /etc/caddy/Caddyfile
```

Contenido:

```
syndra.aivanguard.app {
    # API requests (debe ir ANTES del frontend para que /api/* no caiga al Next.js)
    handle /api/* {
        reverse_proxy localhost:3001
    }

    # Frontend (Next.js) — todo lo demás
    reverse_proxy localhost:3002
}
```

Reiniciar Caddy:

```bash
systemctl restart caddy
systemctl enable caddy   # para que arranque con el servidor
```

Verificar estado:

```bash
systemctl status caddy
```

---

## 5. Clonar el proyecto y subir .env

```bash
cd /opt
git clone https://github.com/TU_USUARIO/automatismos.git syndra
cd syndra

# Opción A: copiar .env desde tu PC local
# (desde tu PC, no desde el VPS)
scp .env root@IP_DE_TU_VPS:/opt/syndra/.env

# Opción B: crear manualmente en el VPS
nano .env
# (pegar contenido del .env)
```

---

## 6. Variables de entorno para producción

Verifica que tu `.env` tenga estos valores correctos:

```env
# Postgres (password seguro, no "postgres")
POSTGRES_PASSWORD=tu-password-seguro-aqui
DATABASE_URL=postgresql://postgres:tu-password-seguro-aqui@localhost:5434/automatismos

# URLs apuntando al dominio final
APP_URL=https://syndra.aivanguard.app
NEXT_PUBLIC_URL=https://syndra.aivanguard.app
NEXT_PUBLIC_API_URL=https://syndra.aivanguard.app/api
API_URL=http://localhost:3001
INTERNAL_API_URL=http://localhost:3001

# Producción
NODE_ENV=production

# Secrets generados (nunca compartir)
JWT_SECRET=<hex-64-chars>
CREDENTIALS_SECRET=<hex-64-chars>

# PayPal LIVE (no sandbox)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
# + los 12 plan IDs
```

---

## 7. Levantar la aplicación

```bash
cd /opt/syndra

# Levantar todos los servicios
docker compose up -d

# Verificar que están corriendo
docker compose ps

# Ver logs en tiempo real
docker compose logs -f
```

---

## 8. Inicializar la base de datos

Solo la primera vez (o después de borrar el volumen):

```bash
# Entrar al contenedor de la API
docker compose exec api sh

# Dentro del contenedor:
cd /app/packages/db
npx prisma migrate deploy
npx prisma db seed
exit
```

**Alternativa** si las migraciones se ejecutan al arrancar (ver `docker/api-entrypoint.sh`):

```bash
# Verificar si el entrypoint ya corre migraciones
cat docker/api-entrypoint.sh
```

---

## 9. Verificar que todo funciona

```bash
# 1. Postgres responde
docker compose exec db pg_isready -U postgres

# 2. API responde
curl http://localhost:3001/api/health

# 3. Frontend responde
curl -I http://localhost:3002

# 4. SSL funciona (desde fuera del VPS)
curl -I https://syndra.aivanguard.app

# 5. Webhook de PayPal es accesible
curl -X POST https://syndra.aivanguard.app/api/paypal/webhook
# (debería devolver 401 o similar, no timeout)
```

---

## 10. Firewall

Configurar UFW para solo exponer los puertos necesarios:

```bash
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (Caddy redirect a HTTPS)
ufw allow 443/tcp    # HTTPS
ufw enable
```

**NO** abrir los puertos 3001, 3002 ni 5434 al exterior. Caddy hace de proxy.

---

## 11. Mantenimiento

### Actualizar la app

```bash
cd /opt/syndra
git pull origin main
docker compose down
docker compose up -d --build
```

### Ver logs

```bash
docker compose logs -f api     # solo API
docker compose logs -f web     # solo frontend
docker compose logs -f db      # solo Postgres
```

### Backup de la base de datos

```bash
# Crear backup
docker compose exec db pg_dump -U postgres automatismos > backup_$(date +%Y%m%d).sql

# Crear carpeta de backups
mkdir -p /opt/backups

# Automatizar con cron (diario a las 3am)
crontab -e
# Añadir:
0 3 * * * cd /opt/syndra && docker compose exec -T db pg_dump -U postgres automatismos > /opt/backups/syndra_$(date +\%Y\%m\%d).sql
```

> **⚠️ TODO: Configurar subida de backups a la nube**
>
> Los backups locales no protegen contra fallo del VPS. Configurar `rclone` para
> subir automáticamente a un bucket externo (Cloudflare R2, Backblaze B2, AWS S3, etc.).
> Opciones gratuitas: R2 y B2 ofrecen 10 GB gratis. Pasos:
> 1. Crear bucket en el proveedor elegido
> 2. Instalar `rclone` en el VPS: `apt install rclone`
> 3. Configurar remote: `rclone config`
> 4. Añadir al cron después del dump: `&& rclone copy /opt/backups/ remote:syndra-backups/`
> 5. Añadir limpieza de backups antiguos (mantener últimos 30 días)

### Reiniciar servicios

```bash
docker compose restart        # todos
docker compose restart api    # solo API
```

---

## Flujo de red

```
Internet
  │
  ▼
syndra.aivanguard.app:443  (Caddy — SSL termination)
  │
  ├── /api/*  →  localhost:3001  (NestJS API)
  │
  └── /*      →  localhost:3002  (Next.js frontend)
                    │
                    └── SSR calls → localhost:3001 (internal)

localhost:5434  (PostgreSQL — solo accesible internamente)
```

---

## Checklist pre-lanzamiento

- [ ] DNS apuntando correctamente (`ping syndra.aivanguard.app`)
- [ ] SSL activo (`https://syndra.aivanguard.app` carga sin advertencias)
- [ ] Registro de usuario funciona
- [ ] Email de activación llega (requiere `RESEND_API_KEY`)
- [ ] Trial de 7 días se muestra correctamente
- [ ] Flujo de PayPal: seleccionar plan → redirige a PayPal → pago → vuelve al dashboard
- [ ] Webhook de PayPal activa la suscripción (verificar en BD)
- [ ] Página de Facturación muestra la suscripción
- [ ] Cancelación de suscripción funciona
- [ ] Páginas legales accesibles (`/legal/terms`, `/legal/privacy`, `/legal/refund`)
- [ ] Firewall configurado (solo 22, 80, 443)
- [ ] Backup automático de BD configurado
- [ ] API key de OpenAI rotada (la anterior puede estar en historial Git)

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Caddy no obtiene SSL | Verifica que el DNS ya propagó y que los puertos 80/443 están abiertos |
| `502 Bad Gateway` | Los contenedores no están corriendo: `docker compose ps` |
| PayPal webhook falla | Verifica URL en PayPal dashboard, revisa `docker compose logs api` |
| Emails no llegan | Configura `RESEND_API_KEY` y verifica el dominio en resend.com |
| Base de datos vacía | Ejecuta `prisma migrate deploy` + `prisma db seed` |
| No carga el frontend | Verifica `NEXT_PUBLIC_URL` en `.env` y rebuild: `docker compose up -d --build` |
