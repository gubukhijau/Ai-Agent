import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Server,
  Zap,
  Clock
} from 'lucide-react';
import { AdminConfig } from '../types';
import { saveAdminConfig } from '../services/api';

interface SecuritySettingsViewProps {
  config: AdminConfig | null;
  onRefreshConfig: () => void;
}

export const SecuritySettingsView: React.FC<SecuritySettingsViewProps> = ({
  config,
  onRefreshConfig,
}) => {
  const [webhookSecret, setWebhookSecret] = useState(
    config?.elevenlabsWebhookSecret || 'ipl_sec_elevenlabs_order_2026'
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [savingSecret, setSavingSecret] = useState(false);
  const [secretMsg, setSecretMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ success: boolean; text: string } | null>(null);

  const generateRandomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    let rand = 'ipl_sec_';
    for (let i = 0; i < 28; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWebhookSecret(rand);
  };

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookSecret.trim()) return;
    setSavingSecret(true);
    setSecretMsg(null);

    try {
      const res = await saveAdminConfig({ elevenlabsWebhookSecret: webhookSecret.trim() });
      setSecretMsg({ success: true, text: res.message });
      onRefreshConfig();
    } catch (err: any) {
      setSecretMsg({ success: false, text: err?.message || 'Gagal menyimpan secret.' });
    } finally {
      setSavingSecret(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordMsg({ success: false, text: 'Kata sandi tidak boleh kosong.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ success: false, text: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ success: false, text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg(null);

    try {
      const res = await saveAdminConfig({ adminPassword: newPassword.trim() });
      setPasswordMsg({ success: true, text: 'Kata sandi admin berhasil diperbarui!' });
      setNewPassword('');
      setConfirmPassword('');
      onRefreshConfig();
    } catch (err: any) {
      setPasswordMsg({ success: false, text: err?.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Pengaturan Keamanan &amp; Integritas Sistem
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Kelola token rahasia webhook, kredensial akses admin, serta proteksi anti-duplikasi pesanan.
        </p>
      </div>

      {/* Security Architecture Audit Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Status Standar Keamanan Sistem
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Bearer Token Autentikasi Webhook</span>
              <span className="text-slate-400 text-[11px]">
                Endpoint ElevenLabs dilindungi token rahasia yang disimpan di server. Permintaan tanpa token ditolak otomatis (HTTP 401/403).
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Proteksi Anti-Duplikasi (Idempotency)</span>
              <span className="text-slate-400 text-[11px]">
                Jendela cache SHA-256 10 menit aktif. Webhook yang terulang tidak akan membombardir WhatsApp admin dengan pesan ganda.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Pembatasan Request (Rate Limiter)</span>
              <span className="text-slate-400 text-[11px]">
                Endpoint tes dibatasi maksimal 5 permintaan per menit untuk mencegah penyalahgunaan kuota WhatsApp Cloud API.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Data Privacy &amp; Zero-Database</span>
              <span className="text-slate-400 text-[11px]">
                Data pesanan diproses langsung (in-memory) dan tidak disimpan ke database permanen demi menjaga privasi pemesan.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Secret Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Token Rahasia Webhook ElevenLabs
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Token ini wajib dicantumkan pada header <code className="text-amber-400 font-mono">Authorization: Bearer &lt;TOKEN&gt;</code> saat ElevenLabs memanggil webhook.
            </p>
          </div>

          <form onSubmit={handleSaveSecret} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ELEVENLABS_WEBHOOK_SECRET
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={copySecret}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                  title="Salin Secret"
                >
                  {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={generateRandomSecret}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Buat Token Acak</span>
              </button>
            </div>

            {secretMsg && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  secretMsg.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {secretMsg.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSecret}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingSecret ? 'Menyimpan...' : 'Perbarui Secret Webhook'}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Password Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Ubah Kata Sandi Admin Dashboard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gunakan kombinasi minimal 6 karakter untuk mengamankan akses ke dashboard ini.
            </p>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  passwordMsg.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
