import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './views/HomeView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AlbumActivationView } from './components/AlbumActivationView';
import { AlbumService, PhotoService, isSupabaseConfigured, supabase } from './lib/supabase';
import { ActiveAlbumSession, extractAccessKeyFromUrl, clearUrlTokens } from './lib/storage';

const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/pasaditaatlixco?vrfl=MTB3bTQwZHlza3l0',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
    hoverClass: 'hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50'
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/share/1C3JUGQFJK/?mibextid=wwXIfr',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    hoverClass: 'hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50'
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@pasaditaatlixco?_r=1&_t=ZS-9AcjEQOD00f',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
      </svg>
    ),
    hoverClass: 'hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100'
  }
];

export default function App() {
  const [albums, setAlbums] = useState([]);
  const [photosByAlbum, setPhotosByAlbum] = useState({});
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;

    let isMounted = true;
    const updateAccess = (session) => {
      setIsAuthenticated(Boolean(session));
      setIsAdmin(session?.user?.app_metadata?.role === 'admin');
      if (session?.user?.app_metadata?.role === 'admin') {
        setShowAdminLogin(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      updateAccess(session);
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setShowAdminLogin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('Error al recuperar la sesión de Supabase:', error);
      if (isMounted) updateAccess(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAdminAlbums = async () => {
      if (isSupabaseConfigured() && !isAdmin) {
        setAlbums([]);
        return;
      }

      try {
        const fetchedAlbums = await AlbumService.getAlbums();
        if (!isMounted) return;
        setAlbums(fetchedAlbums);

        const photoCounts = {};
        for (const album of fetchedAlbums) {
          photoCounts[album.id] = await PhotoService.getPhotos(album.id, album.access_key);
        }
        if (isMounted) setPhotosByAlbum(prev => ({ ...prev, ...photoCounts }));
      } catch (error) {
        console.error('Error al cargar los álbumes de administración:', error);
        if (isMounted) setRouteError('No se pudieron cargar los álbumes. Revisa tu sesión de administrador.');
      }
    };

    loadAdminAlbums();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    const loadAlbumSession = async () => {
      setRouteError('');

      // 1. Extraer si viene en URL (hash o parámetros de búsqueda)
      const urlKey = extractAccessKeyFromUrl();
      let keyToLoad = urlKey;

      if (urlKey) {
        // Guardar token en localStorage
        ActiveAlbumSession.setToken(urlKey);
        // Limpiar inmediatamente la URL usando replaceState para no mostrar el ID
        clearUrlTokens();
      } else {
        // Si no viene en la URL, leer automáticamente desde localStorage
        keyToLoad = ActiveAlbumSession.getToken();
      }

      setAccessKey(keyToLoad || '');

      if (!keyToLoad) {
        setCurrentAlbum(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const album = await AlbumService.getAlbumByAccessKey(keyToLoad);
        if (!isMounted) return;
        if (!album) {
          // Token no válido o álbum inexistente, limpiar de localStorage
          ActiveAlbumSession.clearToken();
          setAccessKey('');
          setCurrentAlbum(null);
          setRouteError('No encontramos un álbum asociado a este enlace NFC.');
          return;
        }

        setCurrentAlbum(album);
        ActiveAlbumSession.setToken(keyToLoad);

        if (album.customer_name) {
          const photos = await PhotoService.getPhotos(album.id, keyToLoad);
          if (isMounted) setPhotosByAlbum(prev => ({ ...prev, [album.id]: photos }));
        } else {
          setPhotosByAlbum(prev => ({ ...prev, [album.id]: [] }));
        }
      } catch (error) {
        console.error('Error al abrir el álbum NFC:', error);
        if (isMounted) setRouteError('No se pudo abrir el álbum. Intenta de nuevo más tarde.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAlbumSession();
    window.addEventListener('hashchange', loadAlbumSession);
    window.addEventListener('popstate', loadAlbumSession);

    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', loadAlbumSession);
      window.removeEventListener('popstate', loadAlbumSession);
    };
  }, []);

  const navigateHome = () => {
    ActiveAlbumSession.clearToken();
    setCurrentAlbum(null);
    setAccessKey('');
    setRouteError('');
    clearUrlTokens();
  };

  const handleSelectAlbum = async (album) => {
    const key = album.access_key || album.id;
    ActiveAlbumSession.setToken(key);
    setAccessKey(key);
    setCurrentAlbum(album);
    clearUrlTokens();

    if (!photosByAlbum[album.id] || photosByAlbum[album.id].length === 0) {
      try {
        const photos = await PhotoService.getPhotos(album.id, key);
        setPhotosByAlbum(prev => ({ ...prev, [album.id]: photos }));
      } catch (e) {
        console.warn('Error al cargar fotos del álbum seleccionado:', e);
      }
    }
  };

  const handleCreateAlbum = async (albumData) => {
    const newAlbum = await AlbumService.createAlbum(albumData);
    setAlbums(prev => [newAlbum, ...prev]);
    setPhotosByAlbum(prev => ({ ...prev, [newAlbum.id]: [] }));
    ActiveAlbumSession.setToken(newAlbum.access_key);
    setAccessKey(newAlbum.access_key);
    setCurrentAlbum(newAlbum);
    clearUrlTokens();
    return newAlbum;
  };

  const handleUpdateAlbum = async (albumId, updates) => {
    const key = accessKey || currentAlbum?.access_key;
    const updated = await AlbumService.updateAlbum(albumId, updates, key);
    setAlbums(prev => prev.map(album => (album.id === albumId ? { ...album, ...updated } : album)));
    setCurrentAlbum(prev => prev?.id === albumId ? { ...prev, ...updated } : prev);
  };

  const handleDeleteAlbum = async (albumId) => {
    await AlbumService.deleteAlbum(albumId);
    setAlbums(prev => prev.filter(album => album.id !== albumId));
    if (currentAlbum?.id === albumId) navigateHome();
  };

  const handleActivateAlbum = async (customerName) => {
    const activatedAlbum = await AlbumService.activateAlbum(accessKey, customerName);
    setCurrentAlbum(activatedAlbum);
    const photos = await PhotoService.getPhotos(activatedAlbum.id, accessKey);
    setPhotosByAlbum(prev => ({ ...prev, [activatedAlbum.id]: photos }));
    setAlbums(prev => prev.map(album => album.id === activatedAlbum.id ? activatedAlbum : album));
  };

  const handleUploadPhoto = async (albumId, fileOrBlob, caption = '') => {
    const newPhoto = await PhotoService.uploadPhoto(albumId, accessKey, fileOrBlob, caption);
    setPhotosByAlbum(prev => ({
      ...prev,
      [albumId]: [newPhoto, ...(prev[albumId] || [])]
    }));
    return newPhoto;
  };

  const handleDeletePhoto = async (albumId, photoId) => {
    const key = currentAlbum?.access_key || accessKey || ActiveAlbumSession.getToken();
    await PhotoService.deletePhoto(albumId, photoId, key, currentAlbum);
    setPhotosByAlbum(prev => ({
      ...prev,
      [albumId]: (prev[albumId] || []).filter(photo => photo.id !== photoId)
    }));
  };

  const handleSignIn = async ({ email, password }) => {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Esta cuenta no tiene permisos de administración.');
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const canManage = !isSupabaseConfigured() || isAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-rose-50/60 to-sky-50/70 text-slate-800 font-sans flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      <Navbar
        currentAlbum={currentAlbum}
        isCloudEnabled={isSupabaseConfigured()}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onSignIn={() => setShowAdminLogin(true)}
        onSignOut={handleSignOut}
        onNavigateHome={navigateHome}
      />

      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm font-semibold text-slate-500">
            Abriendo tu álbum...
          </div>
        ) : routeError ? (
          <div role="alert" className="mx-auto my-16 max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center text-sm font-semibold text-amber-800 shadow-sm">
            {routeError}
          </div>
        ) : currentAlbum && currentAlbum.customer_name ? (
          <AlbumDetailView
            album={currentAlbum}
            photos={photosByAlbum[currentAlbum.id] || []}
            onNavigateHome={navigateHome}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
            onUpdateAlbum={handleUpdateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
            canManage={canManage}
            canUpload
          />
        ) : currentAlbum && !canManage ? (
          <AlbumActivationView album={currentAlbum} onActivate={handleActivateAlbum} />
        ) : currentAlbum ? (
          <AlbumDetailView
            album={currentAlbum}
            photos={photosByAlbum[currentAlbum.id] || []}
            onNavigateHome={navigateHome}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
            onUpdateAlbum={handleUpdateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
            canManage={canManage}
            canUpload={!isSupabaseConfigured() || Boolean(currentAlbum.customer_name)}
          />
        ) : (
          <HomeView
            albums={albums}
            photosByAlbum={photosByAlbum}
            onSelectAlbum={handleSelectAlbum}
            onCreateAlbum={handleCreateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
            isLoading={false}
            canManage={canManage}
          />
        )}
      </main>

      <footer className="glass-panel border-t border-rose-100/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-semibold">
          <p className="text-left text-xs sm:text-sm text-slate-600">
            Álbum de Fotos Digital por Tienda la Pasadita Atlixco  — Tu galería personal interactiva.
          </p>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Teléfono */}
            <a
              href="tel:2441307051"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 transition shadow-sm text-xs font-bold"
              title="Llamar al 244 130 7051"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>244 130 7051</span>
            </a>

            {/* Redes sociales */}
            <div className="flex items-center space-x-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  aria-label={social.name}
                  className={`p-2 rounded-xl bg-white border border-slate-200 text-slate-500 transition shadow-sm ${social.hoverClass}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSignIn={handleSignIn}
        />
      )}
    </div>
  );
}
