-- AlbumNFC Supabase schema
-- Run in the Supabase SQL editor. Customer access is a bearer capability:
-- anyone with the unguessable NFC token can view and add photos to that album.

CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📸',
  cover_url TEXT,
  access_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  customer_name TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS access_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

UPDATE public.albums
SET access_key = gen_random_uuid()::text
WHERE access_key IS NULL;

ALTER TABLE public.albums
  ALTER COLUMN access_key SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN access_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS albums_access_key_unique
  ON public.albums (access_key);

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.album_nfc_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

REVOKE ALL ON FUNCTION public.album_nfc_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.album_nfc_is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "Permitir lectura publica de albumes" ON public.albums;
DROP POLICY IF EXISTS "Permitir lectura publica de fotos" ON public.photos;
DROP POLICY IF EXISTS "Permitir creacion publica de albumes" ON public.albums;
DROP POLICY IF EXISTS "Permitir creacion publica de fotos" ON public.photos;
DROP POLICY IF EXISTS "Permitir edicion publica de albumes" ON public.albums;
DROP POLICY IF EXISTS "Permitir eliminacion publica de albumes" ON public.albums;
DROP POLICY IF EXISTS "Permitir eliminacion publica de fotos" ON public.photos;
DROP POLICY IF EXISTS "Lectura publica de albumes" ON public.albums;
DROP POLICY IF EXISTS "Lectura publica de fotos" ON public.photos;
DROP POLICY IF EXISTS "Administradores pueden leer albumes" ON public.albums;
DROP POLICY IF EXISTS "Administradores pueden crear albumes" ON public.albums;
DROP POLICY IF EXISTS "Administradores pueden editar albumes" ON public.albums;
DROP POLICY IF EXISTS "Administradores pueden eliminar albumes" ON public.albums;
DROP POLICY IF EXISTS "Administradores pueden leer fotos" ON public.photos;
DROP POLICY IF EXISTS "Administradores pueden crear fotos" ON public.photos;
DROP POLICY IF EXISTS "Administradores pueden editar fotos" ON public.photos;
DROP POLICY IF EXISTS "Administradores pueden eliminar fotos" ON public.photos;

CREATE POLICY "Administradores pueden leer albumes"
  ON public.albums FOR SELECT
  USING (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden crear albumes"
  ON public.albums FOR INSERT
  WITH CHECK (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden editar albumes"
  ON public.albums FOR UPDATE
  USING (public.album_nfc_is_admin())
  WITH CHECK (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden eliminar albumes"
  ON public.albums FOR DELETE
  USING (public.album_nfc_is_admin());

CREATE POLICY "Administradores pueden leer fotos"
  ON public.photos FOR SELECT
  USING (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden crear fotos"
  ON public.photos FOR INSERT
  WITH CHECK (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden editar fotos"
  ON public.photos FOR UPDATE
  USING (public.album_nfc_is_admin())
  WITH CHECK (public.album_nfc_is_admin());
CREATE POLICY "Administradores pueden eliminar fotos"
  ON public.photos FOR DELETE
  USING (public.album_nfc_is_admin());

CREATE OR REPLACE FUNCTION public.album_nfc_lookup(p_access_key TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  emoji TEXT,
  cover_url TEXT,
  customer_name TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.title, a.emoji, a.cover_url, a.customer_name, a.activated_at, a.created_at
  FROM public.albums AS a
  WHERE a.access_key = p_access_key;
$$;

CREATE OR REPLACE FUNCTION public.album_nfc_activate(
  p_access_key TEXT,
  p_customer_name TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  emoji TEXT,
  cover_url TEXT,
  customer_name TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_name TEXT := btrim(p_customer_name);
BEGIN
  IF clean_name IS NULL OR length(clean_name) < 1 OR length(clean_name) > 80 THEN
    RAISE EXCEPTION 'El nombre debe tener entre 1 y 80 caracteres.';
  END IF;

  UPDATE public.albums AS a
  SET customer_name = clean_name, activated_at = now(), updated_at = now()
  WHERE a.access_key = p_access_key
    AND a.customer_name IS NULL;

  RETURN QUERY
  SELECT a.id, a.title, a.emoji, a.cover_url, a.customer_name, a.activated_at, a.created_at
  FROM public.albums AS a
  WHERE a.access_key = p_access_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.album_nfc_list_photos(p_access_key TEXT)
RETURNS TABLE (
  id UUID,
  album_id UUID,
  url TEXT,
  caption TEXT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.album_id, p.url, p.caption, p.width, p.height, p.created_at
  FROM public.photos AS p
  JOIN public.albums AS a ON a.id = p.album_id
  WHERE a.access_key = p_access_key
    AND a.customer_name IS NOT NULL
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.album_nfc_add_photo(
  p_access_key TEXT,
  p_storage_path TEXT,
  p_caption TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  album_id UUID,
  url TEXT,
  caption TEXT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_album_id UUID;
  current_photo_count BIGINT;
  inserted_photo public.photos%ROWTYPE;
BEGIN
  IF length(coalesce(p_caption, '')) > 500 THEN
    RAISE EXCEPTION 'El pie de foto no puede superar 500 caracteres.';
  END IF;
  IF split_part(p_storage_path, '/', 1) <> p_access_key
     OR p_storage_path LIKE '%..%'
     OR p_storage_path = p_access_key THEN
    RAISE EXCEPTION 'Ruta de almacenamiento inválida.';
  END IF;

  SELECT a.id INTO target_album_id
  FROM public.albums AS a
  WHERE a.access_key = p_access_key
    AND a.customer_name IS NOT NULL
  FOR UPDATE;
  IF target_album_id IS NULL THEN
    RAISE EXCEPTION 'El álbum no existe o aún no está activado.';
  END IF;
  SELECT count(*) INTO current_photo_count
  FROM public.photos AS p
  WHERE p.album_id = target_album_id;
  IF current_photo_count >= 80 THEN
    RAISE EXCEPTION 'Este álbum ya alcanzó el límite de 80 fotos.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects AS o
    WHERE o.bucket_id = 'album-photos'
      AND o.name = p_storage_path
  ) THEN
    RAISE EXCEPTION 'La imagen no existe en el almacenamiento.';
  END IF;

  INSERT INTO public.photos (album_id, url, caption)
  VALUES (target_album_id, p_storage_path, coalesce(p_caption, ''))
  RETURNING * INTO inserted_photo;

  RETURN QUERY
  SELECT inserted_photo.id, inserted_photo.album_id, inserted_photo.url,
    inserted_photo.caption, inserted_photo.width, inserted_photo.height,
    inserted_photo.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.album_nfc_lookup(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.album_nfc_activate(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.album_nfc_list_photos(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.album_nfc_add_photo(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.album_nfc_lookup(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.album_nfc_activate(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.album_nfc_list_photos(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.album_nfc_add_photo(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.album_nfc_list_photos(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.album_nfc_storage_upload_access(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_album_id UUID;
  stored_object_count BIGINT;
BEGIN
  IF split_part(p_object_name, '/', 2) = ''
     OR p_object_name LIKE '%..%' THEN
    RETURN false;
  END IF;

  SELECT a.id INTO target_album_id
  FROM public.albums AS a
  WHERE a.access_key = split_part(p_object_name, '/', 1)
    AND a.customer_name IS NOT NULL
  FOR UPDATE;
  IF target_album_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO stored_object_count
  FROM storage.objects AS o
  WHERE o.bucket_id = 'album-photos'
    AND split_part(o.name, '/', 1) = split_part(p_object_name, '/', 1);

  RETURN stored_object_count < 80;
END;
$$;

REVOKE ALL ON FUNCTION public.album_nfc_storage_upload_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.album_nfc_storage_upload_access(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.album_nfc_storage_cleanup_access(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.albums AS a
    WHERE a.access_key = split_part(p_object_name, '/', 1)
      AND a.customer_name IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.photos AS p
        WHERE p.album_id = a.id
          AND p.url = p_object_name
      )
  );
$$;

REVOKE ALL ON FUNCTION public.album_nfc_storage_cleanup_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.album_nfc_storage_cleanup_access(TEXT) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'album-photos',
  'album-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Permitir subida publica de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura publica de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrado publico de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Administradores pueden subir imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Administradores pueden eliminar imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Administradores pueden actualizar imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Compradores pueden leer imagenes de su album" ON storage.objects;
DROP POLICY IF EXISTS "Compradores pueden subir imagenes a su album" ON storage.objects;
DROP POLICY IF EXISTS "Compradores pueden limpiar cargas sin registro" ON storage.objects;
DROP POLICY IF EXISTS "Administradores pueden gestionar imagenes" ON storage.objects;

CREATE POLICY "Compradores pueden subir imagenes a su album"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'album-photos'
  AND public.album_nfc_storage_upload_access(name)
);
CREATE POLICY "Compradores pueden limpiar cargas sin registro"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'album-photos'
  AND public.album_nfc_storage_cleanup_access(name)
);
CREATE POLICY "Administradores pueden gestionar imagenes"
ON storage.objects FOR ALL
USING (
  bucket_id = 'album-photos'
  AND public.album_nfc_is_admin()
)
WITH CHECK (
  bucket_id = 'album-photos'
  AND public.album_nfc_is_admin()
);

-- Create the store's Supabase Auth user, then assign admin from a trusted SQL editor:
-- UPDATE auth.users
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- WHERE email = 'admin@example.com';
-- Sign in again to obtain a JWT containing the role.

CREATE OR REPLACE FUNCTION public.album_nfc_update(
  p_access_key TEXT,
  p_title TEXT,
  p_emoji TEXT DEFAULT '📸',
  p_cover_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  emoji TEXT,
  cover_url TEXT,
  customer_name TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_title TEXT;
BEGIN
  clean_title := trim(coalesce(p_title, ''));
  IF clean_title = '' THEN
    RAISE EXCEPTION 'El título del álbum no puede estar vacío.';
  END IF;

  RETURN QUERY
  UPDATE public.albums AS a
  SET title = clean_title,
      emoji = coalesce(p_emoji, a.emoji),
      cover_url = coalesce(p_cover_url, a.cover_url),
      updated_at = now()
  WHERE a.access_key = p_access_key
  RETURNING a.id, a.title, a.emoji, a.cover_url, a.customer_name, a.activated_at, a.created_at, a.updated_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.album_nfc_update(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.album_nfc_delete_photo(
  p_access_key TEXT,
  p_photo_id UUID
)
RETURNS TABLE (
  storage_path TEXT,
  deleted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_storage_path TEXT;
  v_album_id UUID;
BEGIN
  SELECT a.id INTO v_album_id
  FROM public.albums AS a
  WHERE a.access_key = p_access_key;

  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'Clave de acceso de álbum inválida.';
  END IF;

  SELECT p.url INTO v_storage_path
  FROM public.photos AS p
  WHERE p.id = p_photo_id
    AND p.album_id = v_album_id;

  IF v_storage_path IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, false;
    RETURN;
  END IF;

  DELETE FROM public.photos
  WHERE id = p_photo_id;

  IF NOT (v_storage_path LIKE 'http://%' OR v_storage_path LIKE 'https://%' OR v_storage_path LIKE 'data:%') THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'album-photos'
      AND name = v_storage_path;
  END IF;

  RETURN QUERY SELECT v_storage_path, true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.album_nfc_delete_photo(TEXT, UUID) TO anon, authenticated, service_role;
