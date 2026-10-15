import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido.' });
  }

  let accessKey: unknown;
  try {
    ({ access_key: accessKey } = await request.json());
  } catch {
    return jsonResponse(400, { error: 'Solicitud inválida.' });
  }
  if (typeof accessKey !== 'string' || !/^[0-9a-f-]{36}$/i.test(accessKey)) {
    return jsonResponse(400, { error: 'Token de álbum inválido.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Falta configurar el acceso servidor a Supabase.');
    return jsonResponse(500, { error: 'Servicio de imágenes no disponible.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: photos, error: listError } = await adminClient.rpc('album_nfc_list_photos', {
    p_access_key: accessKey
  });
  if (listError) {
    console.error('No se pudieron obtener las fotos del álbum:', listError);
    return jsonResponse(500, { error: 'No se pudieron cargar las fotos.' });
  }

  const signedPhotos = [];
  for (const photo of photos || []) {
    if (typeof photo.url !== 'string' || !photo.url.startsWith(`${accessKey}/`)) {
      console.error('Se omitió un objeto cuya ruta no coincide con el token del álbum.');
      return jsonResponse(500, { error: 'El álbum contiene una ruta de imagen inválida.' });
    }

    const { data, error } = await adminClient.storage
      .from('album-photos')
      .createSignedUrl(photo.url, 3600);
    if (error) {
      console.error('No se pudo firmar una imagen del álbum:', error);
      return jsonResponse(500, { error: 'No se pudieron cargar las fotos.' });
    }
    signedPhotos.push({ ...photo, url: data.signedUrl });
  }

  return jsonResponse(200, { photos: signedPhotos });
});
