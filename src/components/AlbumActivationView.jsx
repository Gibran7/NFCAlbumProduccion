import React, { useState } from 'react';
import { Heart, UserRound } from 'lucide-react';

export const AlbumActivationView = ({ album, onActivate }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80) {
      setError('Escribe un nombre de hasta 80 caracteres.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onActivate(cleanName);
    } catch (activationError) {
      setError(activationError.message || 'No se pudo activar el álbum.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-xl sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Heart className="h-8 w-8" />
        </div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-rose-500">
          Tu recuerdo digital
        </p>
        <h1 className="mb-2 text-3xl font-black text-slate-900">{album.title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          Activa este álbum con tu nombre. Después podrás ver y añadir fotos cada vez que escanees la etiqueta.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            ¿Cómo te llamas?
            <span className="relative mt-1 block">
              <UserRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoComplete="name"
                maxLength={80}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm normal-case tracking-normal text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </span>
          </label>
          <p className="text-xs leading-relaxed text-slate-500">
            Tu nombre aparecerá en este álbum. Cualquiera que tenga el enlace de la etiqueta podrá verlo y añadir fotos.
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Activando...' : 'Activar mi álbum'}
          </button>
        </form>
      </section>
    </main>
  );
};
