// IndexedDB & LocalStorage Manager for robust photo and album persistence

const DB_NAME = 'AlbumNFC_DB';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';
const createLocalAccessKey = () => globalThis.crypto?.randomUUID?.()
  || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const DEFAULT_ATLIXCO_ALBUM = {
  id: 'atlixco-default-nfc-album',
  title: 'Atlixco',
  emoji: '🌺',
  cover_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80',
  created_at: new Date().toISOString(),
  access_key: createLocalAccessKey()
};

const DEFAULT_CHIPIL_ALBUM = {
  id: 'e7e8f5c9-b310-40ad-8d2b-13eaa25cd5db',
  title: 'Chipil',
  emoji: '📸',
  cover_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80',
  created_at: '2026-10-15T05:40:56.633+00:00',
  access_key: '9374d047-f42f-44a0-8f65-d524e1189ee5'
};

const DEFAULT_ATLIXCO_PHOTOS = [
  {
    id: 'photo-atlixco-1',
    album_id: 'atlixco-default-nfc-album',
    url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80',
    caption: 'Vista del Volcán y Zócalo de Atlixco 🌋',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 'photo-atlixco-2',
    album_id: 'atlixco-default-nfc-album',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    caption: 'Calle de las Flores y Colores 🌸',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'photo-atlixco-3',
    album_id: 'atlixco-default-nfc-album',
    url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    caption: 'Tarde soleada en el Pueblo Mágico ☀️',
    created_at: new Date().toISOString()
  }
];

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
    };
  });
}

// Compress images before saving to reduce storage footprint and guarantee fast loading
export async function compressImage(fileOrBlob, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
  return new Promise((resolve) => {
    // If it's already a URL string (not a file/blob), return as is
    if (typeof fileOrBlob === 'string') {
      resolve(fileOrBlob);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(fileOrBlob);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback read as DataURL
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(fileOrBlob);
    };

    img.src = url;
  });
}

export const LocalStorageManager = {
  getAlbums() {
    try {
      const stored = localStorage.getItem('nfc_albums_data');
      let albums = stored ? JSON.parse(stored) : null;
      if (!Array.isArray(albums) || albums.length === 0) {
        albums = [DEFAULT_ATLIXCO_ALBUM, DEFAULT_CHIPIL_ALBUM];
        localStorage.setItem('nfc_albums_data', JSON.stringify(albums));
        this.savePhotosForAlbum(DEFAULT_ATLIXCO_ALBUM.id, DEFAULT_ATLIXCO_PHOTOS);
        return albums;
      }
      // Garantizar que los álbumes predeterminados existan en la lista local
      if (!albums.some(a => a.id === DEFAULT_CHIPIL_ALBUM.id || a.access_key === DEFAULT_CHIPIL_ALBUM.access_key)) {
        albums.push(DEFAULT_CHIPIL_ALBUM);
        localStorage.setItem('nfc_albums_data', JSON.stringify(albums));
      }
      return albums;
    } catch (e) {
      console.error('Error reading local albums:', e);
      return [DEFAULT_ATLIXCO_ALBUM, DEFAULT_CHIPIL_ALBUM];
    }
  },

  getAlbumById(id) {
    const albums = this.getAlbums();
    return albums.find(a => a.id === id) || null;
  },

  saveAlbum(album) {
    const albums = this.getAlbums();
    const existingIndex = albums.findIndex(a => a.id === album.id);
    if (existingIndex >= 0) {
      albums[existingIndex] = { ...albums[existingIndex], ...album, updated_at: new Date().toISOString() };
    } else {
      albums.unshift(album);
    }
    try {
      localStorage.setItem('nfc_albums_data', JSON.stringify(albums));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    return album;
  },

  deleteAlbum(id) {
    let albums = this.getAlbums();
    albums = albums.filter(a => a.id !== id);
    try {
      localStorage.setItem('nfc_albums_data', JSON.stringify(albums));
      localStorage.removeItem(`nfc_photos_${id}`);
    } catch (e) {}
    
    // Also delete from IndexedDB
    openDB().then(db => {
      if (db) {
        const tx = db.transaction(STORE_PHOTOS, 'readwrite');
        const store = tx.objectStore(STORE_PHOTOS);
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value.album_id === id) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }
    });
  },

  async getPhotos(albumId) {
    // First try IndexedDB for large media support
    const db = await openDB();
    if (db) {
      try {
        const photos = await new Promise((resolve) => {
          const tx = db.transaction(STORE_PHOTOS, 'readonly');
          const store = tx.objectStore(STORE_PHOTOS);
          const result = [];
          store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              if (cursor.value.album_id === albumId) {
                result.push(cursor.value);
              }
              cursor.continue();
            } else {
              resolve(result);
            }
          };
          tx.onerror = () => resolve([]);
        });

        if (photos && photos.length > 0) {
          return photos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      } catch (e) {
        console.warn('IndexedDB read error:', e);
      }
    }

    // Fallback to LocalStorage
    try {
      const stored = localStorage.getItem(`nfc_photos_${albumId}`);
      if (!stored) {
        if (albumId === DEFAULT_ATLIXCO_ALBUM.id) {
          return DEFAULT_ATLIXCO_PHOTOS;
        }
        return [];
      }
      return JSON.parse(stored);
    } catch (e) {
      return albumId === DEFAULT_ATLIXCO_ALBUM.id ? DEFAULT_ATLIXCO_PHOTOS : [];
    }
  },

  savePhotosForAlbum(albumId, photos) {
    try {
      localStorage.setItem(`nfc_photos_${albumId}`, JSON.stringify(photos));
    } catch (e) {
      console.warn('LocalStorage save photos quota exceeded, using IndexedDB fallback');
    }

    // Save each to IndexedDB as well
    openDB().then(db => {
      if (db) {
        const tx = db.transaction(STORE_PHOTOS, 'readwrite');
        const store = tx.objectStore(STORE_PHOTOS);
        photos.forEach(p => store.put(p));
      }
    });
  },

  async addPhoto(albumId, photoData) {
    const newPhoto = {
      id: photoData.id || `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      album_id: albumId,
      url: photoData.url,
      caption: photoData.caption || '',
      created_at: new Date().toISOString()
    };

    // Save to IndexedDB (Unlimited capacity for base64 images)
    const db = await openDB();
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_PHOTOS, 'readwrite');
          const store = tx.objectStore(STORE_PHOTOS);
          const req = store.put(newPhoto);
          req.onsuccess = () => resolve();
          req.onerror = () => reject();
        });
      } catch (e) {
        console.warn('IndexedDB put photo error:', e);
      }
    }

    // Update LocalStorage photos list (safely truncated if quota reached)
    const existingPhotos = await this.getPhotos(albumId);
    const updatedList = [newPhoto, ...existingPhotos.filter(p => p.id !== newPhoto.id)];
    try {
      localStorage.setItem(`nfc_photos_${albumId}`, JSON.stringify(updatedList.slice(0, 20)));
    } catch (e) {
      console.warn('LocalStorage photos list quota reached, IndexedDB is active.');
    }

    // Update cover if album has no cover
    const album = this.getAlbumById(albumId);
    if (album && !album.cover_url) {
      album.cover_url = photoData.url;
      this.saveAlbum(album);
    }

    return newPhoto;
  },

  async deletePhoto(albumId, photoId) {
    const db = await openDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_PHOTOS, 'readwrite');
        tx.objectStore(STORE_PHOTOS).delete(photoId);
      } catch (e) {}
    }

    try {
      let photos = await this.getPhotos(albumId);
      photos = photos.filter(p => p.id !== photoId);
      localStorage.setItem(`nfc_photos_${albumId}`, JSON.stringify(photos.slice(0, 20)));
    } catch (e) {}
  }
};

const ACTIVE_ALBUM_TOKEN_KEY = 'nfc_active_album_access_key';

export const ActiveAlbumSession = {
  getToken() {
    try {
      const fromLocal = localStorage.getItem(ACTIVE_ALBUM_TOKEN_KEY);
      if (fromLocal) return fromLocal.trim();
    } catch (e) {}

    // Fallback a cookie
    try {
      const match = document.cookie.match(/(?:^|;\s*)nfc_active_album=([^;]+)/);
      if (match) return decodeURIComponent(match[1]).trim();
    } catch (e) {}

    return '';
  },

  setToken(token) {
    if (!token) {
      this.clearToken();
      return;
    }
    const clean = token.trim();
    try {
      localStorage.setItem(ACTIVE_ALBUM_TOKEN_KEY, clean);
    } catch (e) {
      console.warn('Error al guardar token de álbum en localStorage:', e);
    }
    try {
      document.cookie = `nfc_active_album=${encodeURIComponent(clean)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {}
  },

  clearToken() {
    try {
      localStorage.removeItem(ACTIVE_ALBUM_TOKEN_KEY);
    } catch (e) {}
    try {
      document.cookie = 'nfc_active_album=; path=/; max-age=0; SameSite=Lax';
    } catch (e) {}
  }
};

export const extractAccessKeyFromUrl = () => {
  try {
    // 1. Revisar query parameter: ?album=...
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const fromSearch = searchParams.get('album');
      if (fromSearch) return fromSearch.trim();
    }

    // 2. Revisar hash: #album=..., #album-..., #album/... o #...
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!rawHash) return '';

    const cleanHash = rawHash.startsWith('?') ? rawHash.slice(1) : rawHash;

    // 2a. Query string en hash: #album=xyz o #?album=xyz
    try {
      const hashParams = new URLSearchParams(cleanHash);
      const fromHashParams = hashParams.get('album');
      if (fromHashParams) return fromHashParams.trim();
    } catch (e) {}

    // 2b. Formato #album=xyz
    if (cleanHash.startsWith('album=')) {
      return cleanHash.slice(6).trim();
    }

    // 2c. Formato #album-xyz
    if (cleanHash.startsWith('album-')) {
      return cleanHash.slice(6).trim();
    }

    // 2d. Formato #album/xyz
    if (cleanHash.startsWith('album/')) {
      return cleanHash.slice(6).trim();
    }

    // 2e. Token directo en el hash (si no es home ni vacío)
    if (cleanHash.length > 5 && cleanHash !== 'home') {
      return cleanHash.trim();
    }
  } catch (e) {
    console.warn('Error extrayendo clave de acceso de URL:', e);
  }

  return '';
};

export const clearUrlTokens = () => {
  try {
    if (window.location.hash || (window.location.search && window.location.search.includes('album='))) {
      let cleanPath = window.location.pathname || '/';
      if (window.location.search && window.location.search.includes('album=')) {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('album');
        const remaining = searchParams.toString();
        cleanPath = cleanPath + (remaining ? '?' + remaining : '');
      }
      window.history.replaceState(null, document.title, cleanPath);
    }
  } catch (e) {
    console.error('Error al limpiar URL:', e);
  }
};


