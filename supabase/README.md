# Supabase Configuration

Este directorio contiene configuraciones y scripts relacionados con Supabase.

## Setup inicial

1. Crear proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Copiar las credenciales al `.env.local` raíz
3. Habilitar los siguientes servicios:
   - **Auth**: Email + Magic Link
   - **Storage**: Bucket `media-assets` (privado)
   - **Queues (pgmq)**: Colas base

## Colas configuradas

| Cola | Propósito |
|------|-----------|
| `editorial_jobs` | Jobs del pipeline editorial (research, strategy, content) |
| `media_jobs` | Generación y procesamiento de imágenes y carruseles |
| `publish_jobs` | Publicación en redes sociales |
| `video_jobs` | Renderizado de videos (más lento, cola separada) |
| `analytics_jobs` | Recolección de métricas post-publicación |

## Storage Buckets

| Bucket | Acceso | Contenido |
|--------|--------|-----------|
| `media-assets` | Privado (RLS) | Imágenes, carruseles, videos generados |
| `brand-assets` | Privado (RLS) | Logos, fuentes, templates de marca |
| `research-snapshots` | Privado (RLS) | Snapshots de fuentes de research |
