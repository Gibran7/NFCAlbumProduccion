import React, { useState } from 'react';
import { Plus, Sparkles, Image as ImageIcon, Camera, Heart, Star } from 'lucide-react';
import { AlbumCard } from '../components/AlbumCard';
import { AlbumModal } from '../components/AlbumModal';

export const HomeView = ({ albums, photosByAlbum, onSelectAlbum, onCreateAlbum, onDeleteAlbum, isLoading, canManage }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-3xl p-6 sm:p-10 text-white shadow-2xl shadow-rose-500/20 overflow-hidden">
        {/* Playful background shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Galería Digital Interactiva</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">
            Tus Recuerdos e Historias <br className="hidden sm:block" /> en un solo lugar 🌸
          </h1>

          <p className="text-rose-50 text-sm sm:text-base font-medium leading-relaxed max-w-2xl">
            {canManage
              ? 'Crea álbumes para tus souvenirs. Cada álbum tiene un enlace NFC único; quien lo escanee podrá activarlo con su nombre y añadir fotos.'
              : 'Escanea la etiqueta NFC de tu souvenir para abrir, activar y compartir los recuerdos de su álbum.'}
          </p>

          {canManage && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-rose-600 font-extrabold text-sm flex items-center space-x-2.5 shadow-xl transition active:scale-95"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Crear Nuevo Álbum</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Album Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2">
            <span>{canManage ? 'Álbumes administrados' : 'Mis recuerdos'}</span>
            <span className="text-xs bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full font-extrabold">
              {albums.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {canManage
              ? 'Administra los álbumes y copia el enlace único que programarás en cada etiqueta.'
              : 'Abre este sitio escaneando la etiqueta NFC asociada a tu souvenir.'}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 text-rose-600 font-bold text-xs flex items-center space-x-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Álbum</span>
          </button>
        )}
      </div>

      {/* Album Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-white/80 rounded-3xl animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <ImageIcon className="w-12 h-12 text-rose-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {canManage ? 'Aún no hay álbumes' : 'Abre tu álbum con la etiqueta NFC'}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {canManage
              ? 'Crea un álbum para cada souvenir que quieras vender.'
              : 'Por privacidad, los álbumes no aparecen en un catálogo público.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {albums.map((album) => {
            const count = (photosByAlbum[album.id] || []).length;
            return (
              <AlbumCard
                key={album.id}
                album={album}
                photoCount={count}
                onSelect={onSelectAlbum}
                onDelete={canManage ? onDeleteAlbum : undefined}
                isAdmin={canManage}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && canManage && (
        <AlbumModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (albumData) => {
            await onCreateAlbum(albumData);
          }}
        />
      )}
    </div>
  );
};
