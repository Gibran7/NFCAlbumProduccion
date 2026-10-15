import { createClient } from '@supabase/supabase-js';
import { LocalStorageManager, compressImage } from './storage';

const FALLBACK_SUPABASE_URL = 'https://awkvnvbvgvdxwxldhshl.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3a3ZudmJ2Z3ZkeHd4bGRoc2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTAyMDEsImV4cCI6MjEwNTc4NjIwMX0.g231kL1Xs7mq2XvQUZ1N5fPAhBFcgkh9RZDYlgz5iPs';

const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isRemoteHost = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

let activeUrl = envUrl;
let activeKey = envKey;

// Si estamos en un host remoto (Vercel) y la URL apunta a localhost o está vacía, usar Supabase Cloud
if (isRemoteHost && (!activeUrl || activeUrl.includes('127.0.0.1') || activeUrl.includes('localhost'))) {
  activeUrl = FALLBACK_SUPABASE_URL;
  activeKey = FALLBACK_SUPABASE_KEY;
}

export const isSupabaseConfigured = () => {
  return Boolean(activeUrl && activeKey);
};

export const supabase = isSupabaseConfigured()
  ? createClient(activeUrl, activeKey)
  : null;

const createAccessKey = () => {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Este navegador no permite generar un token NFC seguro.');
  }
  return globalThis.crypto.randomUUID();
};

export const AlbumService = {
  async getAlbums() {
    if (!supabase) return LocalStorageManager.getAlbums();
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Error al consultar álbumes en Supabase, usando local:', e);
      return LocalStorageManager.getAlbums();
    }
  },

  async getAlbumById(id) {
    if (!supabase) return LocalStorageManager.getAlbumById(id);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Error al consultar álbum por ID en Supabase, usando local:', e);
      return LocalStorageManager.getAlbumById(id);
    }
  },

  async getAlbumByAccessKey(accessKey) {
    const cleanKey = accessKey.startsWith('album-') ? accessKey.slice(6) : accessKey;

    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('album_nfc_lookup', {
          p_access_key: accessKey
        });
        if (!error && data?.[0]) {
          return { ...data[0], access_key: accessKey };
        }

        if (cleanKey !== accessKey) {
          const { data: cleanData, error: cleanError } = await supabase.rpc('album_nfc_lookup', {
            p_access_key: cleanKey
          });
          if (!cleanError && cleanData?.[0]) {
            return { ...cleanData[0], access_key: cleanKey };
          }
        }
      } catch (err) {
        console.warn('Error en consulta de Supabase, probando almacenamiento local:', err);
      }
    }

    // Fallback a LocalStorageManager
    const local = LocalStorageManager.getAlbums().find(album =>
      album.access_key === accessKey ||
      album.access_key === cleanKey ||
      album.id === accessKey ||
      album.id === `album-${accessKey}` ||
      `album-${album.access_key}` === accessKey ||
      album.id === cleanKey
    );
    return local || null;
  },

  async activateAlbum(accessKey, customerName) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('album_nfc_activate', {
          p_access_key: accessKey,
          p_customer_name: customerName.trim()
        });
        if (!error && data?.[0]) return data[0];
      } catch (err) {
        console.warn('Error al activar álbum en Supabase, usando local:', err);
      }
    }

    const cleanKey = accessKey.startsWith('album-') ? accessKey.slice(6) : accessKey;
    const album = LocalStorageManager.getAlbums().find(item =>
      item.access_key === accessKey ||
      item.access_key === cleanKey ||
      item.id === accessKey
    );
    if (!album) throw new Error('No se encontró el álbum para este enlace.');
    return LocalStorageManager.saveAlbum({
      ...album,
      customer_name: customerName.trim(),
      activated_at: new Date().toISOString()
    });
  },

  async createAlbum({ title, emoji, coverUrl }) {
    const albumData = {
      title,
      emoji: emoji || '📸',
      cover_url: coverUrl || null,
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      const accessKey = createAccessKey();
      return LocalStorageManager.saveAlbum({
        id: `album-${accessKey}`,
        access_key: accessKey,
        ...albumData
      });
    }

    const { data, error } = await supabase
      .from('albums')
      .insert([albumData])
      .select('id, title, emoji, cover_url, access_key, customer_name, activated_at, created_at, updated_at')
      .single();
    if (error) throw error;
    if (!data.access_key) {
      throw new Error('Supabase creó el álbum, pero no devolvió su token NFC.');
    }
    LocalStorageManager.saveAlbum(data);
    return data;
  },

  async updateAlbum(id, { title, emoji, coverUrl }) {
    const updates = { title, emoji, cover_url: coverUrl };
    if (!supabase) return LocalStorageManager.saveAlbum({ id, ...updates });

    const { data, error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    LocalStorageManager.saveAlbum(data);
    return data;
  },

  async deleteAlbum(id) {
    if (!supabase) return LocalStorageManager.deleteAlbum(id);
    const { data: album, error: lookupError } = await supabase
      .from('albums')
      .select('access_key')
      .eq('id', id)
      .single();
    if (lookupError) throw lookupError;

    let offset = 0;
    const objectPaths = [];
    while (true) {
      const { data: objects, error: listError } = await supabase.storage
        .from('album-photos')
        .list(album.access_key, { limit: 100, offset });
      if (listError) throw listError;
      if (!objects?.length) break;

      objectPaths.push(...objects.map(object => `${album.access_key}/${object.name}`));
      if (objects.length < 100) break;
      offset += objects.length;
    }
    for (let index = 0; index < objectPaths.length; index += 100) {
      const { error: removeError } = await supabase.storage
        .from('album-photos')
        .remove(objectPaths.slice(index, index + 100));
      if (removeError) throw removeError;
    }

    const { error } = await supabase.from('albums').delete().eq('id', id);
    if (error) throw error;
    LocalStorageManager.deleteAlbum(id);
  }
};

export const PhotoService = {
  async getPhotos(albumId, accessKey) {
    if (supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('album-photos', {
          body: { access_key: accessKey }
        });
        if (!error && data?.photos) return data.photos;
      } catch (err) {
        console.warn('Error al obtener fotos de Supabase, usando local:', err);
      }
    }
    return LocalStorageManager.getPhotos(albumId);
  },

  async uploadPhoto(albumId, accessKey, fileOrBlob, caption = '') {
    const compressedDataUrl = await compressImage(fileOrBlob);

    if (supabase) {
      try {
        const response = await fetch(compressedDataUrl);
        const blob = await response.blob();
        const storagePath = `${accessKey}/${createAccessKey()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('album-photos')
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });
        if (uploadError) throw uploadError;

        const { data, error } = await supabase.rpc('album_nfc_add_photo', {
          p_access_key: accessKey,
          p_storage_path: storagePath,
          p_caption: caption
        });
        if (error || !data?.[0]) {
          await supabase.storage.from('album-photos').remove([storagePath]);
          throw error || new Error('No se pudo guardar la fotografía en el álbum.');
        }
        const photo = data?.[0];
        const photos = await this.getPhotos(albumId, accessKey);
        const signedPhoto = photos.find(item => item.id === photo.id);
        return signedPhoto || photo;
      } catch (err) {
        console.warn('Error al subir a Supabase, guardando en local:', err);
      }
    }

    return LocalStorageManager.addPhoto(albumId, {
      url: compressedDataUrl,
      caption
    });
  },

  async deletePhoto(albumId, photoId) {
    if (supabase) {
      try {
        const { data: photo, error: lookupError } = await supabase
          .from('photos')
          .select('url')
          .eq('album_id', albumId)
          .eq('id', photoId)
          .single();
        if (!lookupError && photo) {
          if (!photo.url.startsWith('http://') && !photo.url.startsWith('https://')) {
            await supabase.storage.from('album-photos').remove([photo.url]);
          }
          await supabase.from('photos').delete().eq('id', photoId);
        }
      } catch (err) {
        console.warn('Error al eliminar de Supabase:', err);
      }
    }
    await LocalStorageManager.deletePhoto(albumId, photoId);
  }
};
