import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

export const AdminLoginModal = ({ onClose, onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSignIn({ email, password });
    } catch (signInError) {
      setError(signInError.message || 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-1 flex items-center gap-2 text-rose-600">
          <KeyRound className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Administración</span>
        </div>
        <h2 className="mb-2 text-2xl font-black text-slate-900">Iniciar sesión</h2>
        <p className="mb-5 text-sm text-slate-500">
          Solo las cuentas autorizadas como administradoras pueden modificar álbumes y fotos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm normal-case tracking-normal text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm normal-case tracking-normal text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </label>
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
            {isSubmitting ? 'Validando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};
