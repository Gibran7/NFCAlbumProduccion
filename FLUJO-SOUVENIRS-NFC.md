# Flujo de álbumes para souvenirs con NFC

## Cómo funciona

Cada souvenir tiene su propio álbum. El administrador crea el álbum y programa en su etiqueta NFC el enlace que genera la aplicación. El enlace incluye un token aleatorio único (`access_key`); la aplicación lo usa como llave de acceso al álbum.

### Experiencia del comprador

1. Escanea la etiqueta NFC con el teléfono. Se abre el enlace del álbum sin pedir una cuenta ni contraseña.
2. En el primer acceso, escribe el nombre que quiere mostrar en el álbum. El nombre se guarda una sola vez y queda asociado al álbum.
3. Al activarse, puede ver las fotos, subir nuevas imágenes desde la galería o tomar una foto con el teléfono.
4. Al volver a escanear la etiqueta, el mismo enlace abre el álbum ya activado.

El nombre identifica el álbum, pero **no verifica la identidad** de quien lo escribe. La etiqueta y el enlace son una credencial: cualquiera que obtenga el enlace puede ver las fotos y añadir otras, incluso antes que el comprador legítimo. No publiques enlaces NFC en lugares accesibles antes de entregar el souvenir.

### Experiencia del administrador

1. Inicia sesión desde el botón **Administrar** con una cuenta de Supabase Auth cuyo `app_metadata.role` sea `admin`.
2. Crea un álbum para cada souvenir.
3. Copia el enlace NFC generado para ese álbum y escríbelo en la etiqueta correspondiente.
4. Puede actualizar o eliminar álbumes. El catálogo de álbumes y los datos completos solo son visibles para el administrador.

## Cambios de base de datos

El archivo [`supabase/schema.sql`](./supabase/schema.sql) contiene el esquema y las políticas actuales. En el SQL Editor del proyecto Supabase, ejecútalo completo. Antes, haz un respaldo si ya hay información importante.

### Tablas

- `public.albums`: añade o asegura `access_key` (token único), `customer_name` y `activated_at`. `access_key` tiene valor aleatorio por defecto y un índice único.
- `public.photos`: registra las fotos vinculadas por `album_id`; `url` guarda la ruta privada dentro del bucket.
- El bucket `album-photos` se configura como **privado**, con un máximo de 10 MB por objeto y tipos permitidos JPEG, PNG y WebP.

### Funciones RPC

El cliente anónimo no consulta directamente las tablas para abrir álbumes o fotos. Llama a funciones controladas por token:

- `album_nfc_lookup(token)`: devuelve los datos mínimos del álbum asociado al token.
- `album_nfc_activate(token, nombre)`: valida y guarda el nombre en la primera activación; una activación posterior conserva el nombre original.
- `album_nfc_list_photos(token)`: lista fotos solo del álbum asociado al token y solo después de activarlo.
- `album_nfc_add_photo(token, ruta, pie)`: asocia una imagen subida al álbum correcto y aplica el límite de 80 fotos.
- Funciones auxiliares de Storage verifican el token del primer segmento de la ruta y el límite antes de permitir la carga.

Las funciones tienen `SECURITY DEFINER`, un `search_path` vacío y permisos de ejecución explícitos para `anon` y `authenticated`. Las tablas mantienen RLS: lectura y escritura directa se reservan a usuarios con rol de administrador.

El bucket no es público y **los compradores no tienen permiso de lectura ni de listado en Storage**. Para mostrar fotos, la aplicación invoca la Edge Function `album-photos` con el token NFC. La función consulta `album_nfc_list_photos`, que solo devuelve rutas del álbum asociado a ese token, y emite URLs firmadas de una hora usando la clave `service_role` del servidor. El comprador puede cargar objetos únicamente bajo la ruta de su token; la política del servidor valida que el álbum esté activado y aplica el límite de objetos. La clave `service_role` nunca se envía al frontend.

Después de ejecutar `schema.sql`, despliega la Edge Function desde la raíz del proyecto:

```powershell
supabase functions deploy album-photos
```

La función usa los secretos administrados `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno de Supabase Edge Functions. No los copies a `.env` del frontend. Comprueba en Supabase que la verificación JWT de la función esté habilitada; el cliente llama con la clave pública Supabase y el token NFC se valida de nuevo contra la tabla.

### Cuenta administradora

1. Crea la cuenta del administrador en **Supabase Auth** desde la consola. No habilites el registro público si no se necesita.
2. Desde un contexto confiable —por ejemplo, el SQL Editor de Supabase— asigna el rol. Sustituye el correo:

   ```sql
   UPDATE auth.users
   SET raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   WHERE email = 'admin@example.com';
   ```

3. Cierra e inicia sesión para recibir un JWT actualizado.

No incluyas una clave `service_role` en el frontend ni en variables `VITE_*`. La aplicación cliente solo necesita la URL del proyecto y la clave pública `anon`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

## Actualizar las etiquetas y datos existentes

- Los enlaces NFC antiguos que usaban el ID del álbum (`#album=<id>`) deben reemplazarse por el enlace nuevo con el token (`#album=<access_key>`). Desde la administración, copia el enlace de cada álbum y reprograma su etiqueta.
- Los álbumes preexistentes reciben un `access_key` al ejecutar el esquema, pero `customer_name` empieza vacío. Al abrir su nuevo enlace, el comprador deberá activarlos con su nombre.
- El esquema cambia el bucket existente a privado. Las fotos antiguas guardadas como URLs públicas completas pueden dejar de cargarse. Para conservarlas, migra esos objetos a `album-photos`, actualiza `photos.url` para guardar su ruta relativa (por ejemplo, `<access_key>/<archivo>.jpg`) y prueba que se generen URLs firmadas. Respalda los archivos antes de migrar.
- El esquema actual no crea automáticamente el álbum de demostración Atlixco. Crea álbumes nuevos desde la administración cuando quieras emitir etiquetas.

## Límites y comprobación después de aplicar el esquema

- Máximo de **80 fotos por álbum**; se valida en la interfaz y en las funciones/políticas del servidor.
- Máximo de **10 MB por imagen** en Storage. La aplicación comprime las imágenes a JPEG antes de subirlas.
- Las URLs firmadas de las imágenes duran una hora y se solicitan a la Edge Function al cargar el álbum. La clave pública del cliente no puede listar ni leer directamente los objetos de Storage.
- Comprueba que un enlace NFC válido abra su álbum, solicite el nombre solo antes de activar, conserve el nombre después y permita subir una foto.
- Comprueba también que un token inexistente no revele álbumes, que un token de un álbum no permita consultar otro y que la carga número 81 sea rechazada.
- Prueba la administración por separado: una cuenta sin rol `admin` no debe listar ni modificar álbumes.
