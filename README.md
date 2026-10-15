# AlbumNFC

Aplicación web de álbumes digitales para souvenirs con etiquetas NFC. Cada etiqueta abre un álbum individual sin que el comprador necesite crear una cuenta.

## Flujo NFC

1. El administrador inicia sesión y crea un álbum para el souvenir.
2. Copia el enlace con el token aleatorio del álbum y lo programa en la etiqueta NFC.
3. Al escanear la etiqueta por primera vez, el comprador escribe el nombre que quiere mostrar.
4. El comprador puede ver y añadir fotos al álbum desde su teléfono. El límite es de 80 fotos por álbum y 10 MB por imagen.

El enlace NFC funciona como una llave: cualquiera que tenga el enlace puede ver y añadir fotos. El nombre no verifica la identidad del comprador. Evita compartir el enlace antes de entregar el souvenir.

Para más información sobre el diseño, base de datos y seguridad, consulta [FLUJO-SOUVENIRS-NFC.md](./FLUJO-SOUVENIRS-NFC.md).

## Requisitos

- Node.js y npm.
- Un proyecto en Supabase Cloud o Docker Desktop para correr Supabase localmente.
- Supabase CLI, disponible mediante `npx supabase`.
- Docker Desktop solo es necesario para la opción de Supabase local.

Comprueba las herramientas desde PowerShell:

```powershell

npm --version
npx supabase --version
docker --version
```

## Opción A: Supabase local con Docker

Esta opción ejecuta una instancia de desarrollo de Supabase en tu computadora. Es independiente de Supabase Cloud y sus datos no se comparten con el proyecto remoto.

### 1. Inicia Docker y prepara Supabase

Abre Docker Desktop, espera a que esté iniciado y desde PowerShell corre:

```powershell
cd C:\Users\dayra\escuelichis\AlbumNFC
npx supabase init
npx supabase start
npx supabase status
```

Si ya existe `supabase/config.toml`, no repitas `supabase init`. La primera ejecución de `supabase start` descarga las imágenes y puede tardar.

`supabase status` muestra la URL local, claves y puertos. Las direcciones habituales son:

- API: `http://127.0.0.1:54321`
- Supabase Studio: `http://127.0.0.1:54323`
- Base de datos: `127.0.0.1:54322`

Usa los valores y llaves que muestre tu propio comando `supabase status`.

### 2. Aplica el esquema local

En Supabase Studio local (`http://127.0.0.1:54323`), abre **SQL Editor → New query**, copia el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql), pulsa **Run** y confirma que termine sin errores.

El archivo es SQL directo, no una migración versionada. No uses `supabase db push` con este archivo: ese comando espera migraciones en `supabase/migrations`.

### 3. Sirve localmente la Edge Function

En una terminal aparte, desde la raíz del proyecto:

```powershell
npx supabase functions serve album-photos
```

Deja esta terminal abierta mientras pruebas subir y ver imágenes. La CLI sirve la función conectada al stack Supabase local. No agregues una `service_role` a las variables del frontend.

### 4. Crea una cuenta administradora local

En Supabase Studio local, abre **Authentication → Users** y crea un usuario para desarrollo. Después, desde el SQL Editor local, asigna el rol de administrador; sustituye el correo:

```sql
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'admin@example.com';
```

Cierra e inicia sesión otra vez en la aplicación para que se actualice el rol de la sesión.

### 5. Configura el frontend para Supabase local

Crea o actualiza `.env.local` en la raíz con la URL local y la clave pública `anon` que mostró `npx supabase status`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=PEGA_AQUI_LA_ANON_KEY_LOCAL
```

No uses la clave `service_role` en el frontend. Si modificas `.env.local`, reinicia Vite para que cargue los valores nuevos.

Cuando termines, detén Vite y la función con `Ctrl+C` en sus respectivas terminales. Para detener los servicios Supabase locales:

```powershell
npx supabase stop
```

## Opción B: Supabase Cloud

### 1. Respalda los datos existentes

Si el proyecto ya contiene información, respalda los álbumes, fotos y objetos existentes en Storage antes de modificar el esquema. Las imágenes antiguas pueden requerir migración al bucket privado.

### 2. Aplica el esquema SQL

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **SQL Editor → New query**.
3. Copia el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql).
4. Pulsa **Run** y confirma que terminó sin errores.

Esto configura tablas, columnas, funciones RPC, políticas RLS y el bucket privado `album-photos`. Ejecuta este SQL desde el SQL Editor; no uses `supabase db push`, porque el archivo no está creado como migración versionada.

### 3. Despliega la Edge Function de imágenes

Desde PowerShell, abre la raíz del repositorio y ejecuta:

```powershell
cd C:\Users\dayra\escuelichis\AlbumNFC
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy album-photos --project-ref TU_PROJECT_REF
```

Reemplaza `TU_PROJECT_REF` con el identificador de tu proyecto, visible en una dirección como `https://TU_PROJECT_REF.supabase.co`. Si este repositorio aún no tiene `supabase/config.toml`, inicializa la configuración una sola vez con:

```powershell
npx supabase init
```

La función está en [`supabase/functions/album-photos/index.ts`](./supabase/functions/album-photos/index.ts). Valida el token y genera URLs firmadas temporales para las fotos. Mantén habilitada la verificación JWT de la función.

**No incluyas `SUPABASE_SERVICE_ROLE_KEY` en el frontend, en `.env`/`.env.local` ni en variables `VITE_*`.** Esa clave solo se debe usar en el entorno servidor de Supabase.

### 4. Crea la cuenta administradora

1. En Supabase Dashboard, abre **Authentication → Users** y crea tu cuenta.
2. En **SQL Editor**, asigna el rol `admin`; cambia el correo de ejemplo por el de esa cuenta:

   ```sql
   UPDATE auth.users
   SET raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   WHERE email = 'admin@example.com';
   ```

3. Cierra sesión e inicia sesión nuevamente para que se actualice el rol de la sesión.

No habilites el registro público si no lo necesitas.

### 5. Configura el frontend

Crea o actualiza `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=PEGA_AQUI_LA_CLAVE_PUBLICA_ANON
```

Obtén la URL y la clave pública `anon` en la configuración de API del proyecto Supabase. **Solo la clave pública `anon` debe estar en el navegador.** No uses la clave `service_role`.

El archivo `.env.local` es para desarrollo local; no lo compartas ni lo subas al repositorio. Para producción, configura estas mismas dos variables públicas en el proveedor de hosting y vuelve a desplegar la web.

## Corre la aplicación web en local

Elige primero la opción A o B y configura `.env.local` para que apunte a la instancia elegida. Después, desde otra terminal PowerShell en la raíz:

```powershell
cd C:\Users\dayra\escuelichis\AlbumNFC
npm install
npm run dev
```

Abre en el navegador la URL que muestre Vite, normalmente `http://localhost:5173`. Con la opción A, la aplicación usa el stack Supabase local en Docker; con la opción B, usa el proyecto Supabase Cloud.

Si editas `.env.local`, detén y reinicia Vite para que tome los cambios. Para detenerlo, pulsa `Ctrl+C` en la terminal.

Para probar la compilación de producción:

```powershell
npm run build
npm run preview
```

## Crea álbumes y programa las etiquetas

1. Abre la aplicación local y pulsa **Administrar**.
2. Inicia sesión con la cuenta que tiene el rol `admin`.
3. Crea un álbum para cada souvenir.
4. Copia el enlace NFC generado para ese álbum y prográmalo en su etiqueta.
5. Prueba el enlace antes de entregar el producto.

El comprador no necesita iniciar sesión. En el primer escaneo escribe el nombre que quiere mostrar en el álbum. Cualquiera que tenga el enlace podrá ver y añadir fotos. Los enlaces antiguos que usaban el ID del álbum deben reemplazarse por los nuevos enlaces con token.

## Comprobaciones posteriores

- El enlace NFC abre el álbum correcto y pide el nombre solo antes de la primera activación.
- Después de activarlo, permite ver fotos y subir una imagen.
- La lectura de fotos se realiza mediante la Edge Function; el cliente no puede leer ni listar directamente el bucket.
- Una cuenta sin `app_metadata.role = 'admin'` no puede administrar ni listar álbumes.
- El álbum rechaza la foto número 81.
- El token de un álbum no permite consultar otro álbum.
