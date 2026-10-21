import React, { useState } from 'react';
import {
  Bot,
  Copy,
  Check,
  Code,
  Terminal,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AdminConfig, OrderPayload } from '../types';
import { simulateWebhookCall } from '../services/api';

interface ElevenLabsIntegrationViewProps {
  config: AdminConfig | null;
}

export const ElevenLabsIntegrationView: React.FC<ElevenLabsIntegrationViewProps> = ({
  config,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedToolJson, setCopiedToolJson] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Simulator state
  const [simToken, setSimToken] = useState(config?.elevenlabsWebhookSecret || 'ipl_sec_elevenlabs_order_2026');
  const [simOrder, setSimOrder] = useState<OrderPayload>({
    nama_pelanggan: 'Pak Bambang Suroso',
    nomor_whatsapp: '081234567890',
    alamat_lokasi: 'Jl. Boulevard Gading Serpong Kav. 8, Tangerang',
    jenis_layanan: 'Urug Tanah Merah Super',
    jenis_kendaraan: 'Dump Truck Colt Diesel (7 m³)',
    jumlah_rit: '6',
    jadwal: 'Senin Pukul 09:00 WIB',
    catatan: 'Konfirmasi telepon 1 jam sebelum truk jalan ke lokasi.',
  });

  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    status: number;
    data: any;
  } | null>(null);

  const webhookUrl = config?.webhookUrl || `${window.location.origin}/api/webhooks/elevenlabs/order`;
  const webhookSecret = config?.elevenlabsWebhookSecret || 'ipl_sec_elevenlabs_order_2026';

  // Ready-to-copy ElevenLabs Custom Tool Schema
  const elevenLabsToolSchema = {
    name: 'kirim_notifikasi_pesanan_indoplangsir',
    description:
      'Gunakan tool ini setelah pelanggan menyetujui detail pesanan (nama, nomor WA, lokasi pengiriman, jenis layanan tanah/puing/pasir, jenis armada truk, jumlah rit, dan jadwal). Tool ini akan memproses dan mengirimkan notifikasi instan ke WhatsApp admin IndoPlangsir.',
    url: webhookUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${webhookSecret}`,
      'Content-Type': 'application/json',
    },
    parameters: {
      type: 'object',
      properties: {
        nama_pelanggan: {
          type: 'string',
          description: 'Nama lengkap pelanggan atau pemesan.',
        },
        nomor_whatsapp: {
          type: 'string',
          description: 'Nomor WhatsApp aktif pelanggan untuk dihubungi admin.',
        },
        alamat_lokasi: {
          type: 'string',
          description: 'Alamat lengkap lokasi pengiriman atau proyek bongkaran.',
        },
        jenis_layanan: {
          type: 'string',
          description: 'Jenis kebutuhan (misal: Urug Tanah Merah, Buang Puing, Pasir Pasang, Sirtu).',
        },
        jenis_kendaraan: {
          type: 'string',
          description: 'Jenis kendaraan (misal: Dump Truck Colt Diesel, Tronton, Engkel).',
        },
        jumlah_rit: {
          type: 'string',
          description: 'Jumlah rit atau trip yang dipesan (misal: 5).',
        },
        jadwal: {
          type: 'string',
          description: 'Waktu atau tanggal pengerjaan yang diinginkan.',
        },
        catatan: {
          type: 'string',
          description: 'Catatan tambahan seperti kondisi akses jalan masuk, gang sempit, atau kontak mandor.',
        },
      },
      required: [
        'nama_pelanggan',
        'nomor_whatsapp',
        'alamat_lokasi',
        'jenis_layanan',
        'jenis_kendaraan',
        'jumlah_rit',
        'jadwal',
      ],
    },
  };

  const agentPromptSnippet = `Anda adalah Asisten AI Resmi IndoPlangsir (layanan penyedia material tanah urug, pasir, sirtu, dan jasa buang puing proyek).

TUGAS UTAMA:
1. Sambut penelepon dengan ramah dan tanyakan kebutuhan material atau jasa plangsirnya.
2. Kumpulkan informasi penting berikut dengan teliti:
   - Nama pemesan
   - Nomor WhatsApp yang dapat dihubungi
   - Alamat lengkap lokasi pengiriman atau proyek
   - Jenis layanan (Urug Tanah Merah, Buang Puing, Sirtu, Pasir)
   - Jenis armada yang diinginkan (Dump Truck Colt Diesel 7m³ / Tronton / Engkel)
   - Perkiraan jumlah rit yang dibutuhkan
   - Waktu / jadwal pengerjaan
   - Catatan akses jalan (apakah bisa masuk truk besar / gang sempit)
3. Setelah pelanggan mengonfirmasi semua rincian di atas, panggil tool 'kirim_notifikasi_pesanan_indoplangsir'.
4. Sampaikan kepada pelanggan bahwa pesanan telah diteruskan ke admin IndoPlangsir dan admin akan segera menghubungi via WhatsApp untuk konfirmasi pengiriman armada.`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);

    try {
      const res = await simulateWebhookCall(simOrder, simToken);
      setSimResult(res);
    } catch (err: any) {
      setSimResult({
        status: 500,
        data: { error: err?.message || 'Gagal mengirim simulasi webhook.' },
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Integrasi Webhook ElevenLabs AI Agent
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Hubungkan ElevenLabs Conversational Voice Agent Anda agar dapat memicu notifikasi pesanan ke WhatsApp admin IndoPlangsir secara otomatis.
        </p>
      </div>

      {/* Webhook Endpoint Specification Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          Spesifikasi Endpoint Webhook
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* URL Box */}
          <div className="md:col-span-8 p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              WEBHOOK URL (POST)
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-amber-400 break-all select-all">
                {webhookUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors shrink-0"
                title="Salin Webhook URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* HTTP Method */}
          <div className="md:col-span-4 p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              METODE HTTP
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">POST</span>
          </div>
        </div>

        {/* Auth Header Box */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
          <span className="text-[11px] text-slate-400 font-semibold block mb-1">
            HEADER AUTENTIKASI (BEARER TOKEN)
          </span>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-slate-200 break-all select-all">
              Authorization: Bearer {webhookSecret}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(`Authorization: Bearer ${webhookSecret}`, setCopiedHeader)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors shrink-0"
              title="Salin Header"
            >
              {copiedHeader ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Tool Definition & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tool Definition JSON (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Definisi Tool ElevenLabs (Custom Webhook Tool)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(elevenLabsToolSchema, null, 2), setCopiedToolJson)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              >
                {copiedToolJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin JSON Tool</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Di dashboard ElevenLabs Conversational AI, masuk ke menu <strong>Tools</strong> &rarr; <strong>Add Custom Tool</strong>, lalu gunakan parameter dan endpoint berikut:
            </p>

            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-amber-300/90 overflow-x-auto max-h-[360px] leading-relaxed">
              {JSON.stringify(elevenLabsToolSchema, null, 2)}
            </pre>
          </div>

          {/* AI Agent Prompt Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Instruksi Suara Agen ElevenLabs (System Prompt)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(agentPromptSnippet, setCopiedPrompt)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Prompt</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-sans text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
              {agentPromptSnippet}
            </pre>
          </div>
        </div>

        {/* Right: Interactive Webhook Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Simulator Panggilan Webhook ElevenLabs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Uji langsung pemanggilan webhook dari luar dengan token autentikasi.
              </p>
            </div>

            <form onSubmit={handleSimulateWebhook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bearer Token Simulasi:
                </label>
                <input
                  type="text"
                  required
                  value={simToken}
                  onChange={(e) => setSimToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Coba ubah token untuk menguji penolakan HTTP 403 Forbidden.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pelanggan:
                </label>
                <input
                  type="text"
                  required
                  value={simOrder.nama_pelanggan}
                  onChange={(e) => setSimOrder({ ...simOrder, nama_pelanggan: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp:
                  </label>
                  <input
                    type="text"
                    required
                    value={simOrder.nomor_whatsapp}
                    onChange={(e) => setSimOrder({ ...simOrder, nomor_whatsapp: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jumlah Rit:
                  </label>
                  <input
                    type="text"
                    required
                    value={simOrder.jumlah_rit}
                    onChange={(e) => setSimOrder({ ...simOrder, jumlah_rit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Layanan & Kendaraan:
                </label>
                <input
                  type="text"
                  required
                  value={simOrder.jenis_layanan}
                  onChange={(e) => setSimOrder({ ...simOrder, jenis_layanan: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim Webhook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Eksekusi Panggilan Webhook</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulation Response Output */}
            {simResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  simResult.status === 200
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold">HTTP Status: {simResult.status}</span>
                  <span className="text-[11px] uppercase">
                    {simResult.status === 200 ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <pre className="p-2.5 bg-slate-950/80 rounded font-mono text-[11px] overflow-x-auto text-slate-300 border border-slate-800">
                  {JSON.stringify(simResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
