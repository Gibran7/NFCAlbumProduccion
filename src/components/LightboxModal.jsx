import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2, Calendar, Share2 } from 'lucide-react';
import { DeletePhotoModal } from './DeletePhotoModal';

export const LightboxModal = ({ photos, currentIndex, onClose, onNavigate, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  if (!photos || photos.length === 0 || currentIndex < 0 || currentIndex >= photos.length) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % photos.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose, onNavigate]);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentPhoto.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nfc-album-foto-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(currentPhoto.url, '_blank');
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-2 sm:p-6">
      {/* Top Header */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-slate-950/90 to-transparent">
        <div className="text-white text-xs sm:text-sm font-semibold">
          <span>{currentIndex + 1} de {photos.length}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-800 transition"
            title="Descargar fotografía"
          >
            <Download className="w-5 h-5" />
          </button>
          {onDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-slate-900/80 hover:bg-red-950/80 text-red-400 p-2.5 rounded-xl border border-slate-800 transition"
              title="Eliminar fotografía"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center p-2">
        <img
          src={currentPhoto.url}
          alt={currentPhoto.caption || 'Fotografía ampliada'}
          className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
        />

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={() => onNavigate((currentIndex - 1 + photos.length) % photos.length)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-emerald-500 hover:text-slate-950 text-white p-3 rounded-full border border-slate-800 transition shadow-xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={() => onNavigate((currentIndex + 1) % photos.length)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-emerald-500 hover:text-slate-950 text-white p-3 rounded-full border border-slate-800 transition shadow-xl"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-slate-950/90 to-transparent flex flex-col items-center text-center">
        {currentPhoto.caption && (
          <p className="text-sm font-semibold text-white max-w-xl truncate mb-1">
            {currentPhoto.caption}
          </p>
        )}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{formatDate(currentPhoto.created_at)}</span>
        </div>
      </div>

      <DeletePhotoModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete(currentPhoto.id);
          setShowDeleteModal(false);
          if (photos.length <= 1) onClose();
        }}
      />
    </div>
  );
};
