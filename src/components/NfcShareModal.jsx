import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, HelpCircle } from 'lucide-react';

export const NfcShareModal = ({ album, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Construct absolute URL for the album
  const albumUrl = `${window.location.origin}${window.location.pathname}#album=${album.access_key}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(albumUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/80 p-2 rounded-full border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Smartphone className="w-4 h-4" />
          <span>Vincular a Sticker NFC</span>
        </div>

        <h3 className="text-xl font-extrabold text-white mb-4">
          Álbum: {album.emoji} {album.title}
        </h3>

        <div className="bg-amber-950/40 rounded-2xl p-4 border border-amber-800/60 text-xs leading-relaxed text-amber-100 mb-5">
          Este enlace contiene el token privado del álbum. Compártelo únicamente con quien recibirá el souvenir; cualquier persona con el enlace podrá ver y añadir fotos.
        </div>

        {/* URL Box */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Enlace Directo del Álbum (NDEF URL):
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={albumUrl}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shrink-0 shadow-md"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 space-y-2 text-xs text-slate-300">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <HelpCircle className="w-4 h-4" />
            <span>¿Cómo programar tu Sticker NFC?</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <li>Copia el enlace de arriba.</li>
            <li>Abre cualquier app gratuita de NFC (como <strong>NFC Tools</strong> en iOS o Android).</li>
            <li>Selecciona <strong>Escribir</strong> &rarr; <strong>Añadir un registro</strong> &rarr; <strong>URL / URI</strong>.</li>
            <li>Pega el enlace y acerca tu teléfono al sticker NFC para escribirlo.</li>
            <li>¡Listo! Cada vez que acerques tu celular al sticker, se abrirá este álbum.</li>
          </ol>
        </div>

      </div>
    </div>
  );
};
