import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Table,
  MessageSquare,
  ShieldAlert,
  HardDrive,
  KeyRound,
  FileCode,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  fetchSupabaseStatus,
  saveSupabaseConfig,
  testSupabaseConnection,
  fetchSupabaseOrders,
  fetchSupabaseChats,
} from '../services/api';
import { SupabaseOrder, SupabaseChat, AdminConfig } from '../types';

interface SupabaseViewProps {
  config: AdminConfig | null;
  onRefreshConfig?: () => void;
}

export const SupabaseView: React.FC<SupabaseViewProps> = ({ config, onRefreshConfig }) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    url: string;
    hasKey: boolean;
    ordersCount: number;
    chatsCount: number;
    dispatchCount: number;
  }>({
    isConfigured: false,
    url: '',
    hasKey: false,
    ordersCount: 0,
    chatsCount: 0,
    dispatchCount: 0,
  });

  // Form states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data view states
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'chats' | 'schema'>('orders');
  const [orders, setOrders] = useState<SupabaseOrder[]>([]);
  const [chats, setChats] = useState<SupabaseChat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);

  const sqlSchemaText = `-- SCHEMA SUPABASE INDOPLANGSIR
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nama_pelanggan TEXT NOT NULL,
  nomor_whatsapp TEXT NOT NULL,
  alamat_lokasi TEXT NOT NULL,
  jenis_layanan TEXT NOT NULL,
  jenis_kendaraan TEXT NOT NULL,
  jumlah_rit TEXT NOT NULL,
  jadwal TEXT NOT NULL,
  catatan TEXT DEFAULT '',
  status_notifikasi TEXT NOT NULL DEFAULT 'delivered',
  whatsapp_message_id TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_phone TEXT NOT NULL,
  from_name TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_reply TEXT NOT NULL,
  agent_source TEXT NOT NULL DEFAULT 'elevenlabs',
  order_detected BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  service TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  status TEXT NOT NULL,
  status_code INT NOT NULL,
  whatsapp_message_id TEXT,
  recipient TEXT NOT NULL,
  error_message TEXT
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat_logs" ON public.chat_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access dispatch_logs" ON public.dispatch_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read and insert orders" ON public.orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read and insert chat_logs" ON public.chat_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read and insert dispatch_logs" ON public.dispatch_logs FOR ALL TO anon USING (true) WITH CHECK (true);`;

  const loadStatusAndData = async () => {
    setLoading(true);
    try {
      const res = await fetchSupabaseStatus();
      setStatus(res);
      if (res.isConfigured) {
        const [ordersData, chatsData] = await Promise.all([
          fetchSupabaseOrders(),
          fetchSupabaseChats(),
        ]);
        setOrders(ordersData);
        setChats(chatsData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusAndData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setFeedback({ type: 'error', message: 'URL dan Key Supabase tidak boleh kosong.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
      setFeedback({ type: 'success', message: res.message });
      setSupabaseKey(''); // clear secret field
      await loadStatusAndData();
      if (onRefreshConfig) onRefreshConfig();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await testSupabaseConnection(
        supabaseUrl.trim() || undefined,
        supabaseKey.trim() || undefined
      );
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        await loadStatusAndData();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menguji koneksi.' });
    } finally {
      setTesting(false);
    }
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      o.nama_pelanggan?.toLowerCase().includes(q) ||
      o.nomor_whatsapp?.toLowerCase().includes(q) ||
      o.jenis_layanan?.toLowerCase().includes(q) ||
      o.alamat_lokasi?.toLowerCase().includes(q)
    );
  });

  const filteredChats = chats.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.from_name?.toLowerCase().includes(q) ||
      c.from_phone?.toLowerCase().includes(q) ||
      c.user_message?.toLowerCase().includes(q) ||
      c.agent_reply?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3">
              <Database className="w-3.5 h-3.5" />
              <span>Integrasi Database Supabase (PostgreSQL)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Penyimpanan Database Supabase
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Simpan setiap pesanan masuk dari ElevenLabs AI Agent dan riwayat percakapan WhatsApp customer secara permanen ke tabel PostgreSQL Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={loadStatusAndData}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Connection Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Status Supabase</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            {status.isConfigured ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-lg font-bold text-white">Terhubung</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-lg font-bold text-amber-300">Belum Terhubung</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            {status.url ? `URL: ${status.url}` : 'Perlu konfigurasi SUPABASE_URL & KEY'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Pesanan (Tabel orders)</span>
            <Table className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {status.isConfigured ? orders.length : '-'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Data pesanan tersimpan di cloud PostgreSQL
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Riwayat Chat (Tabel chat_logs)</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {status.isConfigured ? chats.length : '-'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Percakapan interaktif AI Agent WhatsApp
          </div>
        </div>
      </div>

      {/* Supabase Configuration Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan Kredensial Supabase</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Masukkan URL Project dan API Key dari dashboard Supabase Anda (Settings &gt; API &gt; Project URL &amp; service_role / anon key). Kredensial ini juga dapat disimpan di environment variables Vercel sebagai <code className="text-emerald-300">SUPABASE_URL</code> dan <code className="text-emerald-300">SUPABASE_KEY</code>.
        </p>

        {feedback && (
          <div
            className={`p-3.5 rounded-lg text-xs font-medium mb-5 flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{feedback.message}</div>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-white placeholder-slate-600 outline-hidden transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Supabase Key (service_role atau anon)
            </label>
            <input
              type="password"
              placeholder={status.hasKey ? '•••••••••••••••• (Tersimpan)' : 'eyJhbGciOiJIUzI1Ni...'}
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-white placeholder-slate-600 outline-hidden transition-colors font-mono"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji Koneksi...' : 'Uji Koneksi Supabase'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabs for Data and Schema */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-slate-900 text-amber-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabel Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chats')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'chats'
                ? 'bg-slate-900 text-sky-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tabel Chat Logs ({chats.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'schema'
                ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Skrip SQL Schema Supabase</span>
          </button>
        </div>

        {/* Content of selected tab */}
        <div className="p-5">
          {activeSubTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari order pelanggan, whatsapp, lokasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-white placeholder-slate-500 outline-hidden"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Menampilkan {filteredOrders.length} dari {orders.length} pesanan tersimpan
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {status.isConfigured
                    ? 'Belum ada data pesanan di tabel Supabase. Pesanan yang masuk dari ElevenLabs akan otomatis tercatat di sini.'
                    : 'Supabase belum terhubung. Konfigurasikan kredensial di atas untuk menyimpan pesanan secara otomatis.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Pelanggan</th>
                        <th className="py-3 px-4">WhatsApp</th>
                        <th className="py-3 px-4">Layanan & Kendaraan</th>
                        <th className="py-3 px-4">Jumlah Rit</th>
                        <th className="py-3 px-4">Lokasi & Jadwal</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(ord.created_at).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-3 px-4 text-white font-semibold">
                            {ord.nama_pelanggan}
                          </td>
                          <td className="py-3 px-4 text-amber-400 font-mono">
                            {ord.nomor_whatsapp}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div>{ord.jenis_layanan}</div>
                            <div className="text-[11px] text-slate-500">{ord.jenis_kendaraan}</div>
                          </td>
                          <td className="py-3 px-4 text-white">
                            {ord.jumlah_rit} rit
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            <div className="truncate">{ord.alamat_lokasi}</div>
                            <div className="text-[11px] text-slate-500">{ord.jadwal}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                ord.status_notifikasi === 'delivered'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : ord.status_notifikasi === 'duplicate'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {ord.status_notifikasi === 'delivered' ? 'Terkirim WhatsApp' : ord.status_notifikasi}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'chats' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari pesan atau nama kontak..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg text-xs text-white placeholder-slate-500 outline-hidden"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Menampilkan {filteredChats.length} percakapan
                </div>
              </div>

              {filteredChats.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {status.isConfigured
                    ? 'Belum ada log chat WhatsApp di Supabase. Percakapan customer dengan AI Agent akan tercatat otomatis di sini.'
                    : 'Supabase belum terhubung.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChats.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{c.from_name}</span>
                          <span className="text-slate-500 font-mono">({c.from_phone})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                            {c.agent_source}
                          </span>
                          <span className="text-slate-500">
                            {new Date(c.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="bg-slate-900/90 rounded p-2 text-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold mb-0.5">
                            Customer:
                          </span>
                          {c.user_message}
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 text-amber-200">
                          <span className="text-amber-400 block text-[10px] font-semibold mb-0.5">
                            AI Agent WhatsApp:
                          </span>
                          {c.agent_reply}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Skrip SQL Schema Supabase
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Salin skrip di bawah ini, lalu jalankan di menu <strong>SQL Editor</strong> di dashboard Supabase Anda.
                  </p>
                </div>
                <button
                  onClick={copySqlSchema}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Berhasil Disalin!' : 'Salin SQL Schema'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
                <pre>{sqlSchemaText}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
