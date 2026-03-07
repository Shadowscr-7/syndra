-- ============================================================
-- Supabase Queues (pgmq) — Inicialización de colas
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================

-- Habilitar extensión pgmq si no está activa
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Cola principal: pipeline editorial
SELECT pgmq.create('editorial_jobs');

-- Cola de generación de media (imágenes, carruseles)
SELECT pgmq.create('media_jobs');

-- Cola de publicación en redes sociales
SELECT pgmq.create('publish_jobs');

-- Cola de video (separada por tiempos largos y costos)
SELECT pgmq.create('video_jobs');

-- Cola de recolección de analytics
SELECT pgmq.create('analytics_jobs');
