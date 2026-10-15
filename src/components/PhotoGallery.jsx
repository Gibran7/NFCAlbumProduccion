import React from 'react';
import { Image as ImageIcon, Calendar, Trash2 } from 'lucide-react';

export const PhotoGallery = ({ photos, onSelectPhoto, onDeletePhoto }) => {
  if (!photos || photos.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-extrabold text-slate-800 mb-1">Aún no hay fotos en este álbum</h4>
        <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
          Sé el primero en capturar o subir una fotografía usando el botón de la cámara o seleccionando imágenes.
        </p>
      </div>
    );
  }

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {photos.map((photo, index) => (
        <div
          key={photo.id || index}
          onClick={() => onSelectPhoto(photo, index)}
          className="group relative aspect-square bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-rose-300 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/10"
        >
          {/* Image */}
          <img
            src={photo.url}
            alt={photo.caption || `Foto ${index + 1}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-between">
            {/* Top Delete Action */}
            <div className="flex justify-end">
              {onDeletePhoto && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(photo.id);
                  }}
                  className="bg-white/90 hover:bg-rose-600 text-slate-700 hover:text-white p-2 rounded-xl backdrop-blur-md transition shadow-md"
                  title="Eliminar fotografía"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bottom Caption & Date */}
            <div>
              {photo.caption && (
                <p className="text-xs font-bold text-white truncate drop-shadow">
                  {photo.caption}
                </p>
              )}
              <div className="flex items-center space-x-1 text-[10px] text-rose-100 font-semibold mt-1">
                <Calendar className="w-3 h-3 text-rose-300" />
                <span>{formatDate(photo.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
