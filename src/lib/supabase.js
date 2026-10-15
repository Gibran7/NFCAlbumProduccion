import { createClient } from '@supabase/supabase-js';
import { LocalStorageManager, compressImage } from './storage';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => Boolean(envUrl && envKey);

export const supabase = isSupabaseConfigured()
  ? createClient(envUrl, envKey)
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
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAlbumById(id) {
    if (!supabase) return LocalStorageManager.getAlbumById(id);
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getAlbumByAccessKey(accessKey) {
    if (!supabase) {
      return LocalStorageManager.getAlbums().find(album => album.access_key === accessKey) || null;
    }
    const { data, error } = await supabase.rpc('album_nfc_lookup', {
      p_access_key: accessKey
    });
    if (error) throw error;
    return data?.[0] ? { ...data[0], access_key: accessKey } : null;
  },

  async activateAlbum(accessKey, customerName) {
    if (!supabase) {
      const album = LocalStorageManager.getAlbums().find(item => item.access_key === accessKey);
      if (!album) throw new Error('No se encontró el álbum para este enlace.');
      if (!album.customer_name) {
        return LocalStorageManager.saveAlbum({
          ...album,
          customer_name: customerName.trim(),
          activated_at: new Date().toISOString()
        });
      }
      return album;
    }

    const { data, error } = await supabase.rpc('album_nfc_activate', {
      p_access_key: accessKey,
      p_customer_name: customerName.trim()
    });
    if (error) throw error;
    if (!data?.[0]) throw new Error('No se encontró el álbum para este enlace.');
    return data[0];
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
    if (!supabase) return LocalStorageManager.getPhotos(albumId);
    const { data, error } = await supabase.functions.invoke('album-photos', {
      body: { access_key: accessKey }
    });
    if (error) throw error;
    return data?.photos || [];
  },

  async uploadPhoto(albumId, accessKey, fileOrBlob, caption = '') {
    const compressedDataUrl = await compressImage(fileOrBlob);

    if (!supabase) {
      return LocalStorageManager.addPhoto(albumId, {
        url: compressedDataUrl,
        caption
      });
    }

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
      const { error: cleanupError } = await supabase.storage
        .from('album-photos')
        .remove([storagePath]);
      if (cleanupError) {
        console.error('No se pudo limpiar la imagen que no llegó a registrarse:', cleanupError);
      }
      if (error) throw error;
      throw new Error('No se pudo guardar la fotografía en el álbum.');
    }
    const photo = data?.[0];
    const photos = await this.getPhotos(albumId, accessKey);
    const signedPhoto = photos.find(item => item.id === photo.id);
    if (!signedPhoto) throw new Error('La fotografía se guardó, pero no se pudo devolver al álbum.');
    return signedPhoto;
  },

  async deletePhoto(albumId, photoId) {
    if (!supabase) return LocalStorageManager.deletePhoto(albumId, photoId);
    const { data: photo, error: lookupError } = await supabase
      .from('photos')
      .select('url')
      .eq('album_id', albumId)
      .eq('id', photoId)
      .single();
    if (lookupError) throw lookupError;

    if (!photo.url.startsWith('http://') && !photo.url.startsWith('https://')) {
      const { error: removeError } = await supabase.storage
        .from('album-photos')
        .remove([photo.url]);
      if (removeError) throw removeError;
    }
    const { error } = await supabase.from('photos').delete().eq('id', photoId);
    if (error) throw error;
    await LocalStorageManager.deletePhoto(albumId, photoId);
  }
};
