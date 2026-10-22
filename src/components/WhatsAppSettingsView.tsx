import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Key,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Send,
  ExternalLink,
  Info,
  Check,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';
import { AdminConfig } from '../types';
import { saveAdminConfig, sendTestNotification } from '../services/api';

interface WhatsAppSettingsViewProps {
  config: AdminConfig | null;
  onRefreshConfig: () => void;
}

export const WhatsAppSettingsView: React.FC<WhatsAppSettingsViewProps> = ({
  config,
  onRefreshConfig,
}) => {
  const [adminNumber, setAdminNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiVersion, setApiVersion] = useState('v21.0');
  const [templateName, setTemplateName] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('ipl_wa_verify_2026');

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    whatsapp_message_id?: string;
    meta_response?: any;
  } | null>(null);

  // Sync initial state when config loads
  useEffect(() => {
    if (config) {
      if (config.whatsappAdminNumberRaw) setAdminNumber(config.whatsappAdminNumberRaw);
      if (config.whatsappPhoneNumberIdRaw) setPhoneNumberId(config.whatsappPhoneNumberIdRaw);
      if (config.whatsappApiVersion) setApiVersion(config.whatsappApiVersion);
      if (config.whatsappTemplateName) setTemplateName(config.whatsappTemplateName);
      if (config.whatsappVerifyToken) setVerifyToken(config.whatsappVerifyToken);
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    setTestResult(null);

    try {
      const res = await saveAdminConfig({
        whatsappAdminNumber: adminNumber,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappAccessToken: accessToken || undefined, // only send if non-empty
        whatsappApiVersion: apiVersion,
        whatsappTemplateName: templateName,
        whatsappAppSecret: appSecret || undefined,
        whatsappVerifyToken: verifyToken,
      });

      setSaveStatus({ success: true, message: res.message });
      setAccessToken(''); // clear sensitive token input after save
      setAppSecret(''); // clear secret
      onRefreshConfig();
    } catch (err: any) {
      setSaveStatus({ success: false, message: err?.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Send a test ping order
      const pingOrder = {
        nama_pelanggan: 'Uji Koneksi WhatsApp System',
        nomor_whatsapp: adminNumber || config?.whatsappAdminNumberRaw || '62812000000',
        alamat_lokasi: 'Kantor Operasional IndoPlangsir',
        jenis_layanan: 'Tes Jalur Notifikasi Webhook',
        jenis_kendaraan: 'Dump Truck',
        jumlah_rit: '1',
        jadwal: 'Sekarang (Live Connection Check)',
        catatan: 'Ping verifikasi koneksi dari dashboard admin.',
      };

      const res = await sendTestNotification(pingOrder);
      setTestResult(res);
      onRefreshConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Gagal menghubungi server.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Pengaturan WhatsApp Business Cloud API
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Konfigurasi nomor WhatsApp admin dan kredensial Meta Graph API resmi untuk pengiriman notifikasi order secara langsung.
        </p>
      </div>

      {/* Status Alert Banner */}
      {config?.isConfigured ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200">
            <span className="font-bold block text-white">WhatsApp Cloud API Siap Digunakan</span>
            Kredensial Phone Number ID, Access Token, dan Nomor Admin telah terkonfigurasi. Notifikasi order dari ElevenLabs akan langsung diteruskan ke nomor admin WhatsApp.
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-bold block text-white">Status: Belum Dikonfigurasi Lengkap</span>
            Lengkapi nomor WhatsApp admin, WhatsApp Phone Number ID, dan Meta Access Token di bawah agar notifikasi dapat terkirim secara nyata.
          </div>
        </div>
      )}

      {/* Main Settings Form & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Kredensial Meta WhatsApp Cloud API
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Semua token disimpan aman di sisi server (server-side environment/memory).
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Admin WhatsApp Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor WhatsApp Admin Penerima <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminNumber}
                  onChange={(e) => setAdminNumber(e.target.value)}
                  placeholder="Contoh: 6281234567890 (format internasional tanpa +)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition-colors"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gunakan format kode negara tanpa simbol + (contoh: <code className="text-amber-400">6281234567890</code>). Nomor ini yang menerima setiap order baru.
              </p>
            </div>

            {/* Phone Number ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Phone Number ID <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="Contoh: 106543219876543"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition-colors"
                />
                <Layers className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Didapat dari Meta for Developers &rarr; App &rarr; WhatsApp &rarr; API Setup &rarr; <em>Phone number ID</em>.
              </p>
            </div>

            {/* Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Meta Access Token <span className="text-rose-400">*</span>
                </label>
                {config?.whatsappAccessTokenSet && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" />
                    Token Aktif: {config.whatsappAccessTokenMasked}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    config?.whatsappAccessTokenSet
                      ? '•••••••••••••••••••••••••••••••• (Kosongkan jika tidak ingin mengubah)'
                      : 'Tempel Meta System User Token atau Temporary Access Token...'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition-colors"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Permanent System User Access Token atau Temporary 24-hr Token dari dashboard Meta.
              </p>
            </div>

            {/* API Version & Template Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Graph API Version
                </label>
                <input
                  type="text"
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  placeholder="v21.0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default resmi: v21.0</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Template (Opsional)
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Kosongkan untuk Pesan Teks Standar"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">Hanya jika nomor mewajibkan template Meta</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta App Secret (WHATSAPP_APP_SECRET)
                </label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={config?.whatsappAppSecretSet ? `•••••••••••• (${config.whatsappAppSecretMasked})` : 'App Secret dari Meta Developers > Basic Settings'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk memvalidasi tanda tangan X-Hub-Signature-256</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Webhook Verify Token (WHATSAPP_VERIFY_TOKEN)
                </label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="ipl_wa_verify_2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">Dicocokkan saat Meta melakukan handshake GET verifikasi webhook</p>
              </div>
            </div>

            {/* Save Status Notification */}
            {saveStatus && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  saveStatus.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {saveStatus.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!config?.isConfigured && !phoneNumberId)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Menguji ke Meta...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uji Koneksi WhatsApp Cloud API</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>

          {/* Test Result Feedback Box */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-white">
                    {testResult.success
                      ? 'WhatsApp Cloud API Berhasil Terhubung!'
                      : 'Koneksi WhatsApp Cloud API Gagal'}
                  </div>
                  <p>{testResult.message}</p>
                  {testResult.whatsapp_message_id && (
                    <div className="text-[11px] font-mono text-emerald-400 pt-1">
                      Meta Message ID: {testResult.whatsapp_message_id}
                    </div>
                  )}
                  {testResult.meta_response && (
                    <pre className="p-2 mt-2 bg-slate-950/80 rounded font-mono text-[11px] overflow-x-auto border border-slate-800 text-slate-300">
                      {JSON.stringify(testResult.meta_response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Step-by-Step Meta Setup Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Petunjuk Setup Meta WhatsApp Cloud API</span>
            </div>

            <ol className="space-y-3.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li className="pl-1">
                <strong className="text-white">Buka Portal Meta Developer:</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 ml-4">
                  Kunjungi <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-2.5 h-2.5" /></a> dan buat aplikasi baru bertipe <strong>Business</strong>.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-white">Tambahkan Produk WhatsApp:</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 ml-4">
                  Di sidebar aplikasi Meta, klik <strong>WhatsApp</strong> &rarr; <strong>API Setup</strong>.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-white">Salin Phone Number ID:</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 ml-4">
                  Salin deretan angka di kolom <em>Phone number ID</em> ke formulir di sebelah kiri.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-white">Daftarkan Nomor Admin (Sandbox Mode):</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 ml-4">
                  Jika akun Meta masih mode Development/Sandbox, tambahkan nomor WhatsApp admin Anda di menu <em>"To" phone number</em> dan masukkan kode verifikasi OTP yang dikirim Meta.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-white">Permanent System User Token (Produksi):</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 ml-4">
                  Untuk operasional 24/7 tanpa kedaluwarsa token 24 jam, buka <em>Meta Business Manager &rarr; System Users &rarr; Generate Token</em> dengan permission <code className="text-emerald-400">whatsapp_business_messaging</code>.
                </p>
              </li>
            </ol>

            {/* Warning Box regarding ElevenLabs numbers */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-[11px] leading-relaxed">
              <strong className="block text-amber-300 mb-0.5">Catatan Penting ElevenLabs:</strong>
              Jangan mencoba menghubungkan nomor WhatsApp yang sedang dikelola langsung oleh platform ElevenLabs ke Meta Cloud API ini tanpa memastikan kompatibilitasnya. Gunakan nomor WhatsApp terpisah untuk pengirim notifikasi Cloud API.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
