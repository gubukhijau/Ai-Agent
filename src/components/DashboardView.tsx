import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Terminal,
  Trash2
} from 'lucide-react';
import { AdminConfig, DispatchLogEntry, OrderPayload } from '../types';
import { sendTestNotification, fetchDispatchEvents, clearDispatchEvents } from '../services/api';

interface DashboardViewProps {
  config: AdminConfig | null;
  onNavigateToWhatsApp: () => void;
  onNavigateToElevenLabs: () => void;
}

const SAMPLE_PRESETS: { name: string; order: OrderPayload }[] = [
  {
    name: 'Urug Tanah Merah (8 Rit)',
    order: {
      nama_pelanggan: 'Bpk. Hendra Gunawan',
      nomor_whatsapp: '081298765432',
      alamat_lokasi: 'Kavling Grand Wisata Blok D4 No. 12, Bekasi Timur',
      jenis_layanan: 'Urug Tanah Merah Super',
      jenis_kendaraan: 'Dump Truck Colt Diesel (7 m³)',
      jumlah_rit: '8',
      jadwal: 'Besok Pagi Pukul 08:30 WIB',
      catatan: 'Akses jalan masuk muat truk colt diesel, belok kanan dekat pos satpam.',
    },
  },
  {
    name: 'Buang Puing Proyek (3 Rit)',
    order: {
      nama_pelanggan: 'Ibu Maya Kartika',
      nomor_whatsapp: '085712348899',
      alamat_lokasi: 'Jl. Tebet Barat Raya No. 45, Jakarta Selatan',
      jenis_layanan: 'Buang Puing & Sampah Bangunan',
      jenis_kendaraan: 'Dump Truck Engkel (4 m³)',
      jumlah_rit: '3',
      jadwal: 'Hari Ini Jam 14:00 WIB',
      catatan: 'Puing sudah dikarungi rapi di halaman depan proyek.',
    },
  },
  {
    name: 'Pasir Cor & Sirtu (5 Rit Tronton)',
    order: {
      nama_pelanggan: 'Pak Wawan (Mandor Proyek)',
      nomor_whatsapp: '081388990011',
      alamat_lokasi: 'Proyek Ruko Sentul City Sektor 3, Bogor',
      jenis_layanan: 'Pengadaan Pasir Cor & Sirtu Urug',
      jenis_kendaraan: 'Dump Truck Tronton Index 24',
      jumlah_rit: '5',
      jadwal: 'Sabtu Pagi Jam 07:00 WIB',
      catatan: 'Perlu lapor security proyek sebelum masuk gerbang utama.',
    },
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  onNavigateToWhatsApp,
  onNavigateToElevenLabs,
}) => {
  const [orderForm, setOrderForm] = useState<OrderPayload>(SAMPLE_PRESETS[0].order);
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    whatsapp_message_id?: string;
    meta_response?: any;
    error?: string;
  } | null>(null);

  const [events, setEvents] = useState<DispatchLogEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DispatchLogEntry | null>(null);
  const [copiedFormat, setCopiedFormat] = useState(false);

  // Load events safely
  const loadEvents = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    setEventsLoading(true);
    try {
      const data = await fetchDispatchEvents();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch {
      // Gracefully ignored
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setOrderForm(preset.order);
    setTestResult(null);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTestResult(null);

    try {
      const res = await sendTestNotification(orderForm);
      setTestResult(res);
      loadEvents();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Terjadi kesalahan sistem saat memanggil endpoint tes.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Bersihkan log telemetry sementara?')) {
      await clearDispatchEvents();
      loadEvents();
      setSelectedEvent(null);
    }
  };

  // Generate WhatsApp Preview Text
  const previewText = `🔔 ORDER BARU — INDOPLANGSIR

Nama: ${orderForm.nama_pelanggan || '-'}
WhatsApp: ${orderForm.nomor_whatsapp || '-'}
Lokasi: ${orderForm.alamat_lokasi || '-'}
Layanan: ${orderForm.jenis_layanan || '-'}
Kendaraan: ${orderForm.jenis_kendaraan || '-'}
Jumlah: ${orderForm.jumlah_rit || '1'} rit
Jadwal: ${orderForm.jadwal || '-'}
Catatan: ${orderForm.catatan || 'Tidak ada catatan tambahan'}

Status: MENUNGGU PENGECEKAN ADMIN`;

  const copyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard Notifikasi Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Menerima notifikasi dari ElevenLabs AI Agent dan meneruskannya langsung ke WhatsApp admin IndoPlangsir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEvents}
            disabled={eventsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${eventsLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segarkan Status</span>
          </button>
        </div>
      </div>

      {/* Real Architecture Notice Banner */}
      <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Arsitektur Stateless & Zero-Database:</strong>
          Sistem ini hanya bertindak sebagai pemroses notifikasi instan. Ketika webhook order masuk dari ElevenLabs, data divalidasi dan diteruskan ke WhatsApp Cloud API. Tidak ada database CRM atau penyimpanan data pesanan pelanggan.
        </div>
      </div>

      {/* Status Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Webhook Status */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Webhook ElevenLabs</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">Aktif & Siap</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="font-mono truncate">/api/webhooks/elevenlabs/order</span>
          </div>
        </div>

        {/* Card 2: WhatsApp Cloud API Status */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>WhatsApp Cloud API</span>
            {config?.isConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="text-lg font-bold text-white">
            {config?.isConfigured ? (
              <span className="text-emerald-400">Terkonfigurasi</span>
            ) : (
              <span className="text-amber-400">Belum Lengkap</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Admin: {config?.whatsappAdminNumberMasked || 'Belum diisi'}</span>
            {!config?.isConfigured && (
              <button
                onClick={onNavigateToWhatsApp}
                className="text-amber-400 hover:underline font-medium text-[11px]"
              >
                Atur &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Anti-Duplikasi */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Proteksi Duplikasi</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white tabular-nums">
            {config?.deduplicationWindowMinutes || 10} Menit
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Hash signature aktif &bull; Cegah WA ganda
          </div>
        </div>

        {/* Card 4: Rate Limiting & Auth */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Keamanan Akses</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">Bearer & Rate Limit</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Maks 5 tes/menit &bull; Rahasia server-side
          </div>
        </div>
      </div>

      {/* Main Section: Test Dispatcher & Live WhatsApp Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Test Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Uji Notifikasi WhatsApp Admin
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kirim data simulasi order ke WhatsApp admin melalui Meta Cloud API resmi.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Pilih Contoh Order IndoPlangsir:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 text-left rounded-lg text-xs font-medium border transition-colors ${
                    orderForm.nama_pelanggan === preset.order.nama_pelanggan
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="block font-semibold text-white truncate">{preset.name}</span>
                  <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                    {preset.order.jenis_layanan}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSendTest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Pelanggan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.nama_pelanggan}
                  onChange={(e) => setOrderForm({ ...orderForm, nama_pelanggan: e.target.value })}
                  placeholder="Contoh: Bpk. Hendra Gunawan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nomor WhatsApp Pelanggan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.nomor_whatsapp}
                  onChange={(e) => setOrderForm({ ...orderForm, nomor_whatsapp: e.target.value })}
                  placeholder="Contoh: 081298765432"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alamat Lokasi Pengiriman / Proyek <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={orderForm.alamat_lokasi}
                onChange={(e) => setOrderForm({ ...orderForm, alamat_lokasi: e.target.value })}
                placeholder="Contoh: Jl. Raya Narogong Km 14, Pangkalan 2, Bekasi"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Jenis Layanan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.jenis_layanan}
                  onChange={(e) => setOrderForm({ ...orderForm, jenis_layanan: e.target.value })}
                  placeholder="Contoh: Urug Tanah Merah"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Jenis Kendaraan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.jenis_kendaraan}
                  onChange={(e) => setOrderForm({ ...orderForm, jenis_kendaraan: e.target.value })}
                  placeholder="Contoh: Dump Truck Colt Diesel"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Jumlah Rit <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.jumlah_rit}
                  onChange={(e) => setOrderForm({ ...orderForm, jumlah_rit: e.target.value })}
                  placeholder="Contoh: 8"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Jadwal Pengiriman / Pengerjaan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.jadwal}
                  onChange={(e) => setOrderForm({ ...orderForm, jadwal: e.target.value })}
                  placeholder="Contoh: Besok Pukul 08:00 WIB"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={orderForm.catatan || ''}
                  onChange={(e) => setOrderForm({ ...orderForm, catatan: e.target.value })}
                  placeholder="Contoh: Akses gang sempit / puing siap angkut"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Test Result Message Box */}
            {testResult && (
              <div
                className={`p-4 rounded-lg border text-xs leading-relaxed ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-white">
                      {testResult.success ? 'Notifikasi Berhasil Terkirim ke WhatsApp Meta' : 'Gagal Mengirim Notifikasi'}
                    </div>
                    <div>{testResult.message}</div>
                    {testResult.whatsapp_message_id && (
                      <div className="text-[11px] font-mono text-emerald-400/90 pt-1">
                        Meta Message ID: {testResult.whatsapp_message_id}
                      </div>
                    )}
                    {testResult.meta_response && !testResult.success && (
                      <pre className="p-2 mt-2 bg-slate-950/80 rounded font-mono text-[11px] overflow-x-auto text-rose-300/90 border border-rose-500/20">
                        {JSON.stringify(testResult.meta_response, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Penerima:{' '}
                <span className="font-mono text-slate-200">
                  {config?.whatsappAdminNumberMasked || 'Belum diatur'}
                </span>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungi WhatsApp Cloud API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Notifikasi Tes Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: WhatsApp Format Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Format Notifikasi WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={copyPreview}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                title="Salin format teks"
              >
                {copiedFormat ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Chat Simulation Container */}
            <div className="bg-[#0b141a] rounded-xl p-4 border border-slate-800 shadow-inner">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60 text-xs text-slate-400">
                <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  WA
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">WhatsApp Admin IndoPlangsir</div>
                  <div className="text-[10px] text-slate-400">Pesan Masuk Otomatis</div>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#1f2c34] rounded-lg p-3 text-slate-100 text-xs shadow-sm font-sans whitespace-pre-wrap leading-relaxed select-text border border-emerald-500/10">
                {previewText}
              </div>

              <div className="text-[10px] text-slate-400 text-right mt-1.5 font-mono">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} &bull; Terkirim otomatis
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Catatan Format:</div>
              <p>
                Format pesan ini dikirim langsung ke WhatsApp admin IndoPlangsir tanpa modifikasi, mempermudah admin langsung menghubungi nomor WhatsApp pemesan untuk konfirmasi ketersediaan armada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Dispatch Verification Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Konsol Verifikasi Pengiriman Real-Time
              </h2>
              <p className="text-xs text-slate-400">
                Memverifikasi status respons nyata server & Meta Graph API (In-Memory transient log).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Bersihkan log dari memori"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Notifikasi</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Jalankan tes notifikasi di atas atau panggil endpoint webhook ElevenLabs untuk melihat respons server dan Meta Graph API di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Waktu</th>
                  <th className="py-2.5 px-3 font-medium">Sumber</th>
                  <th className="py-2.5 px-3 font-medium">Pelanggan & Layanan</th>
                  <th className="py-2.5 px-3 font-medium">Status Provider</th>
                  <th className="py-2.5 px-3 font-medium">HTTP</th>
                  <th className="py-2.5 px-3 font-medium">Meta Message ID / Keterangan</th>
                  <th className="py-2.5 px-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {events.map((evt) => {
                  let statusBadge = (
                    <span className="text-emerald-400 font-medium">Terkirim</span>
                  );
                  if (evt.status === 'failed') {
                    statusBadge = <span className="text-rose-400 font-medium">Gagal</span>;
                  } else if (evt.status === 'duplicate') {
                    statusBadge = (
                      <span className="text-amber-400 font-medium">Duplikasi Dicegah</span>
                    );
                  } else if (evt.status === 'unconfigured') {
                    statusBadge = (
                      <span className="text-slate-400 font-medium">Belum Dikonfigurasi</span>
                    );
                  }

                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-300 font-medium">
                          {evt.source === 'webhook' ? 'ElevenLabs' : 'Admin Test'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {evt.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {evt.service} &bull; {evt.vehicle}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{statusBadge}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                        {evt.statusCode}
                      </td>
                      <td className="py-2.5 px-3">
                        {evt.whatsappMessageId ? (
                          <span className="font-mono text-[11px] text-emerald-400/90 truncate block max-w-[220px]">
                            {evt.whatsappMessageId}
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-300/90 truncate block max-w-[220px]">
                            {evt.errorMessage || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                Detail Respons Meta & Event #{selectedEvent.id}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Waktu Pengiriman</span>
                  <span className="text-white font-mono">{selectedEvent.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status Server</span>
                  <span className="text-white font-medium uppercase">{selectedEvent.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Pelanggan</span>
                  <span className="text-white">{selectedEvent.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Admin Penerima</span>
                  <span className="text-white font-mono">{selectedEvent.recipient}</span>
                </div>
              </div>

              {selectedEvent.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300">
                  <div className="font-semibold mb-1">Pesan Kesalahan:</div>
                  <p>{selectedEvent.errorMessage}</p>
                </div>
              )}

              {selectedEvent.whatsappMessageId && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 font-mono text-[11px]">
                  <div className="font-semibold mb-1 font-sans text-xs">Meta Message ID:</div>
                  <div className="break-all">{selectedEvent.whatsappMessageId}</div>
                </div>
              )}

              <div>
                <span className="text-slate-400 block mb-1">Payload Mentah dari Server / Meta:</span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedEvent.rawResponse || selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
