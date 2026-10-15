import React, { useState } from 'react';
import { X, Database, Check, AlertTriangle, Key, ExternalLink, RefreshCw } from 'lucide-react';
import { setSupabaseConfig, isSupabaseConfigured } from '../lib/supabase';

export const SupabaseConfigModal = ({ onClose }) => {
  const currentUrl = localStorage.getItem('supabase_project_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const currentKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const [url, setUrl] = useState(currentUrl);
  const [key, setKey] = useState(currentKey);
  const isConnected = isSupabaseConfigured();

  const handleSave = (e) => {
    e.preventDefault();
    setSupabaseConfig(url, key);
  };

  const handleResetToDemo = () => {
    if (confirm('¿Cambiar al Modo Demo Local en IndexedDB/LocalStorage?')) {
      setSupabaseConfig('', '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/80 p-2 rounded-full border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Database className="w-4 h-4" />
          <span>Configuración de Supabase</span>
        </div>

        <h3 className="text-xl font-extrabold text-white mb-2">
          Conectar tu propia Base de Datos
        </h3>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          La app funciona en <strong>Modo Demo Local</strong> inmediatamente. Para guardar fotos en la nube con Supabase, ingresa la URL y la llave anónima de tu proyecto.
        </p>

        {/* Current status pill */}
        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between mb-5 ${
          isConnected
            ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
            : 'bg-amber-950/50 border-amber-800/80 text-amber-300'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold">
              {isConnected ? 'Supabase Conectado' : 'Modo Demo Activo (Almacenamiento Local)'}
            </span>
          </div>
          {isConnected && (
            <button
              onClick={handleResetToDemo}
              className="text-[11px] underline hover:text-white text-slate-400"
            >
              Usar Modo Local
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzxyzxyz.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Anon Public Key
            </label>
            <textarea
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1"
            >
              <span>Crear cuenta en Supabase</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Recargar</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
