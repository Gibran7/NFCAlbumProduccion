import React, { useState } from 'react';
import { ArrowLeft, Camera, Upload, Edit, Trash2, Calendar, Image as ImageIcon, Sparkles, Copy, Check } from 'lucide-react';
import { PhotoUploader } from '../components/PhotoUploader';
import { PhotoGallery } from '../components/PhotoGallery';
import { LightboxModal } from '../components/LightboxModal';
import { CameraModal } from '../components/CameraModal';
import { AlbumModal } from '../components/AlbumModal';

export const AlbumDetailView = ({
  album,
  photos,
  onNavigateHome,
  onUploadPhoto,
  onDeletePhoto,
  onUpdateAlbum,
  onDeleteAlbum,
  canManage,
  canUpload = false
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!album) return null;

  const maxPhotos = album.max_photos || 80;

  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  const handleDeleteAlbum = () => {
    if (confirm(`¿Estás seguro de que deseas eliminar el álbum "${album.title}" y todas sus fotos? Esta acción no se puede deshacer.`)) {
      onDeleteAlbum(album.id);
      onNavigateHome();
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#album=${album.access_key}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-8">
      {/* Top Header / Navigation Actions */}
      <div className={`flex flex-wrap items-center gap-3 ${canManage ? 'justify-between' : 'justify-end'}`}>
        {canManage && (
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Copy Direct Link for Sticker NFC */}
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs transition shadow-sm"
            title="Copiar enlace directo para grabar a un Sticker NFC"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-rose-500" />
                <span>Copiar Enlace de Álbum</span>
              </>
            )}
          </button>

          {/* Botón para que el usuario pueda editar y personalizar su álbum */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 font-bold text-xs transition shadow-sm"
            title="Editar portada, nombre y emoji del álbum"
          >
            <Edit className="w-4 h-4 text-rose-500" />
            <span>Editar Álbum</span>
          </button>

          {canManage && (
            <button
              onClick={handleDeleteAlbum}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold text-xs transition shadow-sm"
              title="Eliminar este álbum"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Album Banner */}
      <div className="relative bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
        <div className="relative h-52 sm:h-72 w-full bg-slate-100">
          {album.cover_url ? (
            <img
              src={album.cover_url}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-rose-100 via-pink-100 to-amber-100 flex items-center justify-center">
              <span className="text-7xl">{album.emoji || '📸'}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />

          {/* Banner Info Content */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div
                onClick={() => setShowEditModal(true)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shrink-0 cursor-pointer hover:scale-105 transition"
                title="Editar portada y emoji del álbum"
              >
                {album.emoji || '📸'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow">
                    {album.title}
                  </h1>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition backdrop-blur-sm"
                    title="Editar nombre y portada"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center space-x-3 text-xs text-rose-100 font-semibold">
                  <span className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white font-bold">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{photos.length} / {maxPhotos} fotos</span>
                  </span>
                  <span>•</span>
                  {album.customer_name ? (
                    <span>Recuerdos de {album.customer_name}</span>
                  ) : (
                    <span>Creado el {formatDate(album.created_at)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Camera Action Button */}
            {canUpload && photos.length < maxPhotos && (
              <button
                onClick={() => setShowLiveCamera(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xl shadow-rose-500/25 transition active:scale-95"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>Abrir Cámara en Vivo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Uploader Component */}
      {canUpload && photos.length < maxPhotos && (
        <PhotoUploader
          albumTitle={album.title}
          photoCount={photos.length}
          maxPhotos={maxPhotos}
          onUploadFiles={(file) => onUploadPhoto(album.id, file)}
          onOpenLiveCamera={() => setShowLiveCamera(true)}
        />
      )}
      {canUpload && photos.length >= maxPhotos && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
          Este álbum alcanzó su límite de {maxPhotos} fotos.
        </p>
      )}

      {/* Photo Gallery Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-extrabold text-slate-900">Galería de Fotografías</h3>
            <span className="text-xs bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full font-extrabold">
              {photos.length} / {maxPhotos}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Haz clic en cualquier foto para ampliar</span>
        </div>

        <PhotoGallery
          photos={photos}
          onSelectPhoto={(photo, idx) => setSelectedPhotoIndex(idx)}
          onDeletePhoto={onDeletePhoto ? (photoId) => onDeletePhoto(album.id, photoId) : undefined}
        />
      </div>

      {/* Modals */}
      {showLiveCamera && canUpload && photos.length < maxPhotos && (
        <CameraModal
          albumId={album.id}
          albumTitle={album.title}
          onClose={() => setShowLiveCamera(false)}
          onPhotoCaptured={(file) => onUploadPhoto(album.id, file)}
        />
      )}

      {selectedPhotoIndex !== null && (
        <LightboxModal
          photos={photos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(newIdx) => setSelectedPhotoIndex(newIdx)}
          onDelete={onDeletePhoto ? (photoId) => onDeletePhoto(album.id, photoId) : undefined}
        />
      )}

      {showEditModal && (
        <AlbumModal
          albumToEdit={album}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => onUpdateAlbum(album.id, updates)}
        />
      )}
    </div>
  );
};
