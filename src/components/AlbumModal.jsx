import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Smile, Upload, Check } from 'lucide-react';

const EMOJI_OPTIONS = ['🌺', '📸', '🏖️', '🎉', '💖', '🐶', '🚗', '🏔️', '🍕', '🎨', '✈️', '🎵', '⭐', '🍀'];

const COVER_PRESETS = [
  '/covers/cover-1.jpg',
  '/covers/cover-2.jpg',
  '/covers/cover-3.jpg',
  '/covers/cover-4.jpg',
  '/covers/cover-5.jpg',
];

export const AlbumModal = ({ albumToEdit = null, onClose, onSave }) => {
  const [title, setTitle] = useState(albumToEdit ? albumToEdit.title : '');
  const [emoji, setEmoji] = useState(albumToEdit ? albumToEdit.emoji : '📸');
  const [coverUrl, setCoverUrl] = useState(albumToEdit ? albumToEdit.cover_url || '' : COVER_PRESETS[0]);
  const [coverFile, setCoverFile] = useState(null);
  const [previewCover, setPreviewCover] = useState(albumToEdit ? albumToEdit.cover_url || COVER_PRESETS[0] : COVER_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setPreviewCover(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        finalCoverUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(coverFile);
        });
      }

      await onSave({
        title: title.trim(),
        emoji,
        coverUrl: finalCoverUrl
      });
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'No se pudo guardar el álbum.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-rose-500 text-xs font-extrabold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>{albumToEdit ? 'Editar Álbum' : 'Nuevo Álbum'}</span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-6">
          {albumToEdit ? 'Personalizar Álbum' : 'Crear un Nuevo Álbum'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nombre del Álbum
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Atlixco, Viaje de Verano, Cumpleaños..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm font-semibold"
            />
          </div>

          {/* Emoji Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Elige un Emoji Representativo
            </label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    emoji === e
                      ? 'bg-rose-500 text-white scale-110 shadow-md shadow-rose-500/30'
                      : 'hover:bg-slate-200 border border-transparent'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Photo Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Portada del Álbum
            </label>
            
            {/* Preview Box */}
            <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 group">
              <img
                src={previewCover}
                alt="Vista previa de portada"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="cursor-pointer bg-white text-slate-800 font-extrabold text-xs px-4 py-2 rounded-xl border border-slate-200 hover:bg-rose-500 hover:text-white transition flex items-center space-x-2 shadow-lg">
                  <Upload className="w-4 h-4" />
                  <span>Subir Foto de Portada</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-500 font-semibold">Predeterminados:</span>
              {COVER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCoverUrl(preset);
                    setPreviewCover(preset);
                    setCoverFile(null);
                  }}
                  className={`w-12 h-10 rounded-xl overflow-hidden border-2 transition ${
                    coverUrl === preset && !coverFile ? 'border-rose-500 scale-105 shadow-md' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}

          {/* Submit Buttons */}
          <div className="pt-4 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-rose-500/25 active:scale-95"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{albumToEdit ? 'Guardar Cambios' : 'Crear Álbum'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
