import React from 'react';
import { Camera, Home, ChevronRight, KeyRound, LogOut } from 'lucide-react';

export const Navbar = ({ currentAlbum, isCloudEnabled, isAuthenticated, isAdmin, onSignIn, onSignOut, onNavigateHome }) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-rose-100/80 px-4 py-3 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center space-x-3 group focus:outline-none"
              title="Volver al panel principal"
            >
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-all border border-rose-100 flex items-center justify-center bg-white">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left hidden xs:block">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-rose-700">
                  Álbum de Fotos
                </span>
                <span className="block text-[10px] font-bold text-rose-500 -mt-1 tracking-wider uppercase">
                  Galería Personal
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center space-x-3 select-none">
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-rose-500/20 border border-rose-100 flex items-center justify-center bg-white">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left hidden xs:block">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-rose-700">
                  Álbum de Fotos
                </span>
                <span className="block text-[10px] font-bold text-rose-500 -mt-1 tracking-wider uppercase">
                  Galería Personal
                </span>
              </div>
            </div>
          )}

          {currentAlbum && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <div className="flex items-center space-x-2 bg-white/90 border border-slate-200/80 rounded-xl px-3 py-1 shadow-sm">
                <span className="text-lg">{currentAlbum.emoji || '📸'}</span>
                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate max-w-[120px] sm:max-w-[200px]">
                  {currentAlbum.title}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Action button */}
        <div className="flex items-center space-x-2.5">
          {isCloudEnabled && (
            isAdmin ? (
              <button
                onClick={onSignOut}
                className="flex items-center space-x-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Salir de administración</span>
              </button>
            ) : !currentAlbum ? (
              <button
                onClick={onSignIn}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:text-rose-600"
              >
                <KeyRound className="h-3.5 w-3.5 text-rose-500" />
                <span>Administrar</span>
              </button>
            ) : null
          )}
          {currentAlbum && isAdmin && (
            <button
              onClick={onNavigateHome}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 text-xs font-bold text-slate-700 hover:text-rose-600 transition shadow-sm"
            >
              <Home className="w-3.5 h-3.5 text-rose-500" />
              <span>Mis Álbumes</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
