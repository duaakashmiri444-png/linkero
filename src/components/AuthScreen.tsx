import React, { useState } from 'react';
import { store } from '../services/store';
import { LockKeyhole, Mail, KeyRound, UserRound, Loader2, ShieldAlert } from 'lucide-react';

interface AuthScreenProps {
  onClose?: () => void;
  onAuthenticated?: (message: string) => void;
  reason?: string | null;
}

/**
 * Real credentials against POST /api/auth/login or /api/auth/register. There is no
 * demo-account shortcut and no way to grant yourself a role from this screen.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose, onAuthenticated, reason }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result =
      mode === 'login'
        ? await store.login(email.trim(), password)
        : await store.register(email.trim(), username.trim(), password);

    setSubmitting(false);
    if (result.success) {
      onAuthenticated?.(result.message);
      onClose?.();
      return;
    }
    setError(result.message);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-[#101322] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <LockKeyhole className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{mode === 'login' ? 'Sign in to Desi Ero' : 'Create your account'}</h2>
            <p className="text-xs text-slate-400">
              {mode === 'login' ? 'Your wallet and library are tied to your login.' : 'New accounts start with the welcome credit balance.'}
            </p>
          </div>
        </div>

        {reason && (
          <div className="mx-6 mt-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{reason}</div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="you@example.com"
            />
          </label>

          {mode === 'register' && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                <UserRound className="w-3 h-3" /> Username
              </span>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                placeholder="display name"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> Password
            </span>
            <input
              type="password"
              required
              minLength={mode === 'register' ? 6 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder={mode === 'register' ? 'at least 6 characters' : 'your password'}
            />
          </label>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Checking…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-purple-300 hover:text-purple-200">
              {mode === 'login' ? 'Need an account?' : 'Already registered? Sign in'}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="hover:text-white">
                Continue browsing
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
