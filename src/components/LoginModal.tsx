import React, { useState } from 'react';
import { Lock, Truck, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginAdmin } from '../services/api';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Masukkan kata sandi admin.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginAdmin(password.trim());
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.message || 'Kata sandi salah.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefault = () => {
    setPassword('indoplangsir2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8">
        {/* Brand Lockup */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center overflow-hidden">
            <img
              src="/src/assets/images/indoplangsir_logo_1792601904567.jpg"
              alt="IndoPlangsir Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Truck className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">INDOPLANGSIR</h2>
          <p className="text-xs text-slate-400 mt-1">
            Order Notification Engine &bull; Admin Access
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Halaman ini dilindungi autentikasi server. Akses terbatas untuk admin pengelola webhook ElevenLabs dan WhatsApp Business Cloud API.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Kata Sandi Admin
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Memverifikasi...</span>
            ) : (
              <>
                <span>Masuk Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Default hint for user */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Kata sandi default awal:{' '}
            <button
              type="button"
              onClick={handleUseDefault}
              className="text-amber-400 hover:underline font-mono text-xs"
              title="Gunakan kata sandi default"
            >
              indoplangsir2026
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
