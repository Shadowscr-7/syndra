-- ============================================================
-- Storage Buckets — Inicialización
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================

-- Bucket para media assets generados (imágenes, carruseles, videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-assets',
  'media-assets',
  false,
  104857600, -- 100MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
) ON CONFLICT (id) DO NOTHING;

-- Bucket para assets de marca (logos, fuentes, templates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'font/ttf', 'font/otf', 'font/woff2']
) ON CONFLICT (id) DO NOTHING;

-- Bucket para snapshots de research
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'research-snapshots',
  'research-snapshots',
  false,
  10485760, -- 10MB
  ARRAY['application/json', 'text/html', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies — Acceso por workspace autenticado
-- ============================================================

-- Media assets: solo usuarios autenticados del workspace
CREATE POLICY "Authenticated users can manage media assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'media-assets')
WITH CHECK (bucket_id = 'media-assets');

-- Brand assets: solo usuarios autenticados del workspace
CREATE POLICY "Authenticated users can manage brand assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'brand-assets')
WITH CHECK (bucket_id = 'brand-assets');

-- Research snapshots: solo usuarios autenticados
CREATE POLICY "Authenticated users can manage research snapshots"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'research-snapshots')
WITH CHECK (bucket_id = 'research-snapshots');
