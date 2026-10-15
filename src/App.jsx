import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './views/HomeView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AlbumActivationView } from './components/AlbumActivationView';
import { AlbumService, PhotoService, isSupabaseConfigured, supabase } from './lib/supabase';

const getAccessKeyFromHash = () => {
  const hash = window.location.hash.slice(1);
  return new URLSearchParams(hash).get('album') || '';
};

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
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        setCurrentAlbum(null);
        setAccessKey('');
        setRouteError('');
        setIsLoading(false);
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
        setPhotosByAlbum({});
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
        if (isMounted) setPhotosByAlbum(photoCounts);
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

    const loadAlbumFromLink = async () => {
      const key = getAccessKeyFromHash();
      setRouteError('');
      setAccessKey(key);
      setCurrentAlbum(null);

      if (!key) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const album = await AlbumService.getAlbumByAccessKey(key);
        if (!isMounted) return;
        if (!album) {
          setRouteError('No encontramos un álbum asociado a este enlace NFC.');
          return;
        }

        setCurrentAlbum(album);
        if (album.customer_name) {
          const photos = await PhotoService.getPhotos(album.id, key);
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

    loadAlbumFromLink();
    window.addEventListener('hashchange', loadAlbumFromLink);
    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', loadAlbumFromLink);
    };
  }, []);

  const navigateHome = () => {
    setCurrentAlbum(null);
    setAccessKey('');
    window.location.hash = '';
  };

  const handleCreateAlbum = async (albumData) => {
    const newAlbum = await AlbumService.createAlbum(albumData);
    setAlbums(prev => [newAlbum, ...prev]);
    setPhotosByAlbum(prev => ({ ...prev, [newAlbum.id]: [] }));
    window.location.hash = `album=${newAlbum.access_key}`;
    return newAlbum;
  };

  const handleUpdateAlbum = async (albumId, updates) => {
    const updated = await AlbumService.updateAlbum(albumId, updates);
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
    await PhotoService.deletePhoto(albumId, photoId);
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
            onSelectAlbum={(album) => {
              window.location.hash = `album=${album.access_key}`;
            }}
            onCreateAlbum={handleCreateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
            isLoading={false}
            canManage={canManage}
          />
        )}
      </main>

      <footer className="glass-panel border-t border-rose-100/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-semibold">
          <p>🌸 <strong>Álbum de Fotos Digital</strong> — Tu galería personal interactiva.</p>
          <p className="text-[11px] text-slate-400">
            Cada etiqueta NFC abre un álbum independiente.
          </p>
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
