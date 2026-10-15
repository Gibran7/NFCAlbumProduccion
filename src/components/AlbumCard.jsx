import React, { useState } from 'react';
import { Camera, Image as ImageIcon, ArrowRight, Trash2, Sparkles, Copy, Check } from 'lucide-react';

export const AlbumCard = ({ album, photoCount = 0, onSelect, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const defaultBg = "bg-gradient-to-br from-rose-100 via-pink-50 to-amber-100";

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de que deseas eliminar el álbum "${album.title}" y todas sus fotos?`)) {
      onDelete(album.id);
    }
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const link = `${window.location.origin}${window.location.pathname}#album=${album.access_key}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative glass-card rounded-3xl overflow-hidden border border-slate-200/80 hover:border-rose-300 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col justify-between">
      {/* Cover Image Header */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelect(album)}>
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full ${defaultBg} flex items-center justify-center`}>
            <span className="text-6xl drop-shadow transform group-hover:scale-110 transition-transform">
              {album.emoji || '📸'}
            </span>
          </div>
        )}

        {/* Soft Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />

        {/* Emoji Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3 py-1 flex items-center space-x-1 shadow-md">
          <span className="text-xl">{album.emoji || '📸'}</span>
        </div>

        {/* Action Buttons Top Right: Copy Link & Delete */}
        <div className="absolute top-3 right-3 flex items-center space-x-1.5">
          <button
            onClick={handleCopyLink}
            className="bg-white/90 hover:bg-rose-500 text-slate-700 hover:text-white backdrop-blur-md border border-slate-200 hover:border-rose-400 rounded-2xl p-2.5 transition shadow-md"
            title="Copiar enlace directo de este álbum"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 font-bold" /> : <Copy className="w-4 h-4" />}
          </button>

          {onDelete && (
            <button
              onClick={handleDelete}
              className="bg-white/90 hover:bg-rose-600 text-slate-500 hover:text-white backdrop-blur-md border border-slate-200 hover:border-rose-500 rounded-2xl p-2.5 transition shadow-md"
              title="Eliminar este álbum"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Default Tag Badge for Atlixco */}
        {album.title.toLowerCase() === 'atlixco' && (
          <div className="absolute bottom-3 left-3 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-lg shadow-md flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-slate-950" />
            <span>Destacado</span>
          </div>
        )}
      </div>

      {/* Album Info & Action */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="cursor-pointer" onClick={() => onSelect(album)}>
          <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors truncate">
            {album.title}
          </h3>
          <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500 font-semibold">
            <span className="flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>{photoCount} {photoCount === 1 ? 'foto' : 'fotos'}</span>
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
          <button
            onClick={() => onSelect(album)}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-rose-500/20 active:scale-95"
          >
            <span>Ver Álbum</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
