import React from 'react';
import { Camera, Home, ChevronRight, KeyRound, LogOut } from 'lucide-react';

export const Navbar = ({ currentAlbum, isCloudEnabled, isAuthenticated, isAdmin, onSignIn, onSignOut, onNavigateHome }) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-rose-100/80 px-4 py-3 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-all">
              <Camera className="w-5 h-5 stroke-[2.5]" />
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
          {isCloudEnabled && isAuthenticated ? (
            <button
              onClick={onSignOut}
              className="flex items-center space-x-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isAdmin ? 'Salir de administración' : 'Cerrar sesión'}</span>
            </button>
          ) : isCloudEnabled && (
            <button
              onClick={onSignIn}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:text-rose-600"
            >
              <KeyRound className="h-3.5 w-3.5 text-rose-500" />
              <span>Administrar</span>
            </button>
          )}
          {currentAlbum && (
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
