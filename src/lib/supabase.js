import { createClient } from '@supabase/supabase-js';
import { LocalStorageManager, compressImage, ActiveAlbumSession } from './storage';

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

    const findLocalAlbum = (idOrKey) => {
      return LocalStorageManager.getAlbums().find(a =>
        a.access_key === accessKey ||
        a.access_key === cleanKey ||
        a.id === accessKey ||
        a.id === cleanKey ||
        a.id === `album-${accessKey}` ||
        `album-${a.access_key}` === accessKey ||
        (idOrKey && a.id === idOrKey)
      );
    };

    if (supabase) {
      try {
        let albumRecord = null;

        const { data, error } = await supabase.rpc('album_nfc_lookup', {
          p_access_key: accessKey
        });
        if (!error && data?.[0]) {
          albumRecord = data[0];
        } else if (cleanKey !== accessKey) {
          const { data: cleanData, error: cleanError } = await supabase.rpc('album_nfc_lookup', {
            p_access_key: cleanKey
          });
          if (!cleanError && cleanData?.[0]) {
            albumRecord = cleanData[0];
          }
        }

        if (albumRecord) {
          const localMatch = findLocalAlbum(albumRecord.id);

          // Intentar obtener max_photos directo de la base de datos si está disponible
          let dbMaxPhotos = null;
          try {
            const { data: directAlbum } = await supabase
              .from('albums')
              .select('max_photos')
              .eq('id', albumRecord.id)
              .maybeSingle();
            if (directAlbum?.max_photos) {
              dbMaxPhotos = directAlbum.max_photos;
            }
          } catch (e) {}

          const resolvedMax = Number(
            albumRecord.max_photos ||
            dbMaxPhotos ||
            localMatch?.max_photos ||
            80
          );

          const fullAlbum = {
            ...albumRecord,
            max_photos: resolvedMax,
            access_key: accessKey
          };
          LocalStorageManager.saveAlbum(fullAlbum);
          return fullAlbum;
        }
      } catch (err) {
        console.warn('Error en consulta de Supabase, probando almacenamiento local:', err);
      }
    }

    // Fallback a LocalStorageManager
    const local = findLocalAlbum();
    return local || null;
  },

  async activateAlbum(accessKey, customerName) {
    const previousAlbum = await this.getAlbumByAccessKey(accessKey);
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('album_nfc_activate', {
          p_access_key: accessKey,
          p_customer_name: customerName.trim()
        });
        if (!error && data?.[0]) {
          const activated = {
            max_photos: previousAlbum?.max_photos || 80,
            ...data[0],
            access_key: accessKey
          };
          LocalStorageManager.saveAlbum(activated);
          return activated;
        }
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
      max_photos: album.max_photos || previousAlbum?.max_photos || 80,
      activated_at: new Date().toISOString()
    });
  },

  async createAlbum({ title, emoji, coverUrl, maxPhotos = 80 }) {
    const limit = [30, 50, 80].includes(Number(maxPhotos)) ? Number(maxPhotos) : 80;
    const albumData = {
      title,
      emoji: emoji || '📸',
      cover_url: coverUrl || null,
      max_photos: limit,
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

    try {
      const { data, error } = await supabase
        .from('albums')
        .insert([albumData])
        .select('id, title, emoji, cover_url, access_key, max_photos, customer_name, activated_at, created_at, updated_at')
        .single();

      if (!error && data?.access_key) {
        LocalStorageManager.saveAlbum(data);
        return data;
      }

      if (error && error.message && error.message.includes('max_photos')) {
        const { max_photos, ...fallbackData } = albumData;
        const { data: fbData, error: fbError } = await supabase
          .from('albums')
          .insert([fallbackData])
          .select('id, title, emoji, cover_url, access_key, customer_name, activated_at, created_at, updated_at')
          .single();
        if (fbError) throw fbError;
        const finalAlbum = { ...fbData, max_photos: limit };
        LocalStorageManager.saveAlbum(finalAlbum);
        return finalAlbum;
      }
      if (error) throw error;
      if (!data?.access_key) {
        throw new Error('Supabase creó el álbum, pero no devolvió su token NFC.');
      }
      return data;
    } catch (insertErr) {
      if (insertErr?.message?.includes('max_photos')) {
        const { max_photos, ...fallbackData } = albumData;
        const { data: fbData, error: fbError } = await supabase
          .from('albums')
          .insert([fallbackData])
          .select('id, title, emoji, cover_url, access_key, customer_name, activated_at, created_at, updated_at')
          .single();
        if (fbError) throw fbError;
        const finalAlbum = { ...fbData, max_photos: limit };
        LocalStorageManager.saveAlbum(finalAlbum);
        return finalAlbum;
      }
      throw insertErr;
    }
  },

  async updateAlbum(id, { title, emoji, coverUrl, maxPhotos }, accessKey = '') {
    const updates = { title, emoji, cover_url: coverUrl };
    if (maxPhotos && [30, 50, 80].includes(Number(maxPhotos))) {
      updates.max_photos = Number(maxPhotos);
    }

    if (supabase) {
      try {
        const key = accessKey || (typeof window !== 'undefined' ? localStorage.getItem('nfc_active_album_access_key') : '');
        if (key) {
          const { data, error } = await supabase.rpc('album_nfc_update', {
            p_access_key: key,
            p_title: title,
            p_emoji: emoji,
            p_cover_url: coverUrl
          });
          if (!error && data?.[0]) {
            const updated = { ...data[0], ...(updates.max_photos ? { max_photos: updates.max_photos } : {}) };
            LocalStorageManager.saveAlbum(updated);
            return updated;
          }
        }

        const { data, error } = await supabase
          .from('albums')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          LocalStorageManager.saveAlbum(data);
          return data;
        }
        if (error && error.message && error.message.includes('max_photos')) {
          const { max_photos, ...fallbackUpdates } = updates;
          const { data: fbData, error: fbError } = await supabase
            .from('albums')
            .update(fallbackUpdates)
            .eq('id', id)
            .select()
            .single();
          if (!fbError && fbData) {
            const finalUpdated = { ...fbData, ...(updates.max_photos ? { max_photos: updates.max_photos } : {}) };
            LocalStorageManager.saveAlbum(finalUpdated);
            return finalUpdated;
          }
        }
      } catch (err) {
        console.warn('Error al actualizar en Supabase, guardando en local:', err);
      }
    }

    return LocalStorageManager.saveAlbum({ id, ...updates });
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
        const isWebp = blob.type === 'image/webp';
        const extension = isWebp ? 'webp' : 'jpg';
        const contentType = isWebp ? 'image/webp' : 'image/jpeg';
        const storagePath = `${accessKey}/${createAccessKey()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('album-photos')
          .upload(storagePath, blob, {
            contentType,
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

  async deletePhoto(albumId, photoId, accessKey = '', albumData = null) {
    if (!photoId) return;

    if (supabase) {
      try {
        const rawKey = accessKey ||
          albumData?.access_key ||
          (typeof ActiveAlbumSession !== 'undefined' ? ActiveAlbumSession.getToken() : '') ||
          (typeof window !== 'undefined' ? localStorage.getItem('nfc_active_album_access_key') : '') ||
          '';

        const candidateKeys = [
          rawKey,
          albumData?.access_key,
          albumData?.id,
          albumId
        ].filter(Boolean);

        const keysToTry = [];
        for (const k of candidateKeys) {
          const str = String(k).trim();
          if (!str) continue;
          const clean = str.startsWith('album-') ? str.slice(6) : str;
          if (!keysToTry.includes(clean)) keysToTry.push(clean);
          if (!keysToTry.includes(str)) keysToTry.push(str);
        }

        const isUuid = typeof photoId === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photoId);

        let deletedFromDb = false;

        if (isUuid) {
          for (const key of keysToTry) {
            try {
              const { data, error } = await supabase.rpc('album_nfc_delete_photo', {
                p_access_key: key,
                p_photo_id: photoId
              });

              if (!error) {
                deletedFromDb = true;
                const storagePath = data?.[0]?.storage_path;
                if (storagePath) {
                  try {
                    await supabase.storage.from('album-photos').remove([storagePath]);
                  } catch (e) {}
                }
                break;
              }
            } catch (rpcErr) {
              // Probar siguiente clave candidata
            }
          }
        }

        // Respaldo directo en caso de que sea administrador o exista política
        if (!deletedFromDb && isUuid) {
          try {
            await supabase.from('photos').delete().eq('id', photoId);
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error al eliminar de Supabase:', err);
      }
    }

    // Eliminar también de almacenamiento local (IndexedDB y LocalStorage)
    await LocalStorageManager.deletePhoto(albumId, photoId);
  }
};
