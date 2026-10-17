import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const DeletePhotoModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-3 shadow-inner">
          <AlertTriangle className="w-7 h-7 text-rose-500 stroke-[2.2]" />
        </div>

        <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
          ¿Eliminar fotografía?
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
          Advertencia: Esta foto se eliminará definitivamente de tu álbum y del almacenamiento en la nube. Esta acción no se puede deshacer.
        </p>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs transition shadow-md shadow-rose-500/25 flex items-center justify-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sí, eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
