import React, { useState, useEffect } from 'react';
import {
  Bot,
  MessageSquare,
  Copy,
  Check,
  Send,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { AdminConfig, AIChatLogEntry, AIChatMessage } from '../types';
import {
  saveAdminConfig,
  testAIChat,
  fetchAIChats,
  clearAIChats,
  sendLiveWhatsAppTestReply,
} from '../services/api';

interface AIChatAgentViewProps {
  config: AdminConfig | null;
  onRefreshConfig: () => void;
}

export const AIChatAgentView: React.FC<AIChatAgentViewProps> = ({
  config,
  onRefreshConfig,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form State
  const [verifyToken, setVerifyToken] = useState(
    config?.whatsappWebhookVerifyToken || 'ipl_wa_verify_2026'
  );
  const [agentId, setAgentId] = useState(config?.elevenlabsAgentId || '');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Direct Live WhatsApp Test State (Bukan Simulator)
  const [rightTabMode, setRightTabMode] = useState<'live_whatsapp' | 'simulator'>('live_whatsapp');
  const [liveRecipient, setLiveRecipient] = useState('');
  const [liveTestPrompt, setLiveTestPrompt] = useState('Halo, mau tanya harga urug tanah merah 5 rit ke Bekasi');
  const [sendingLiveWA, setSendingLiveWA] = useState(false);
  const [liveWAResult, setLiveWAResult] = useState<{
    success: boolean;
    message: string;
    whatsappMessageId?: string;
    replyText?: string;
    error?: string;
  } | null>(null);

  // Interactive Simulator State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [simulatedChatHistory, setSimulatedChatHistory] = useState<AIChatMessage[]>([
    {
      id: 'init_1',
      sender: 'agent',
      text: 'Halo! Selamat datang di layanan WhatsApp Resmi IndoPlangsir 🚜\n\nKami siap melayani kebutuhan material urug tanah merah, buang puing proyek, pasir cor, dan sirtu. Ada yang bisa kami bantu untuk kebutuhan armada dump truck Anda hari ini?',
      timestamp: 'Baru saja',
    },
  ]);

  // Live incoming chats from server
  const [chatLogs, setChatLogs] = useState<AIChatLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (config) {
      if (config.whatsappWebhookVerifyToken) setVerifyToken(config.whatsappWebhookVerifyToken);
      if (config.elevenlabsAgentId) setAgentId(config.elevenlabsAgentId);
      if (config.whatsappAdminNumberRaw && !liveRecipient) {
        setLiveRecipient(config.whatsappAdminNumberRaw);
      }
    }
  }, [config]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAIChats();
      setChatLogs(data);
    } catch {
      // quiet
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 6000);
    return () => clearInterval(interval);
  }, []);

  const inboundWebhookUrl =
    config?.whatsappInboundWebhookUrl ||
    `${window.location.origin}/api/webhooks/whatsapp`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await saveAdminConfig({
        whatsappWebhookVerifyToken: verifyToken.trim(),
        elevenlabsAgentId: agentId.trim(),
        elevenlabsApiKey: apiKey.trim() || undefined,
      });

      setSaveMsg({ success: true, text: res.message });
      setApiKey('');
      onRefreshConfig();
    } catch (err: any) {
      setSaveMsg({ success: false, text: err?.message || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLiveWhatsAppTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveRecipient.trim()) {
      setLiveWAResult({ success: false, message: 'Nomor WhatsApp tujuan wajib diisi.' });
      return;
    }
    setSendingLiveWA(true);
    setLiveWAResult(null);

    try {
      const res = await sendLiveWhatsAppTestReply(liveRecipient.trim(), liveTestPrompt.trim());
      setLiveWAResult(res);
      loadLogs();
    } catch (err: any) {
      setLiveWAResult({
        success: false,
        message: err?.message || 'Gagal mengirim pesan langsung ke WhatsApp.',
      });
    } finally {
      setSendingLiveWA(false);
    }
  };

  const handleSendSimulatedMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMsgText = chatInput.trim();
    setChatInput('');

    const userMessage: AIChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setSimulatedChatHistory((prev) => [...prev, userMessage]);
    setSendingChat(true);

    try {
      const res = await testAIChat(userMsgText, 'Calon Pemesan', '6281298765432');
      const agentMessage: AIChatMessage = {
        id: 'msg_reply_' + Date.now(),
        sender: 'agent',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setSimulatedChatHistory((prev) => [...prev, agentMessage]);
      loadLogs();
    } catch (err: any) {
      const errorMessage: AIChatMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'agent',
        text: 'Maaf, terjadi gangguan jaringan saat memproses balasan AI.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setSimulatedChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleClearChatHistory = async () => {
    if (confirm('Bersihkan riwayat percakapan log sementara?')) {
      await clearAIChats();
      loadLogs();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Chat AI Agent WhatsApp (ElevenLabs &amp; IndoPlangsir)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Jadikan nomor WhatsApp Business IndoPlangsir sebagai Asisten Chat AI dua arah: menjawab pertanyaan seputar material tanah/puing/pasir, melayani pelanggan 24/7, dan otomatis mengumpulkan data pesanan untuk admin.
        </p>
      </div>

      {/* Two-Way Architecture Flow Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Alur Interaksi Chat AI Dua Arah (Two-Way Chatbot)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">1. Pelanggan Mengirim WA</span>
            <p className="text-slate-300 text-[11px]">
              Pelanggan mengirim pesan teks ke nomor WhatsApp Business IndoPlangsir.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">2. Inbound Webhook</span>
            <p className="text-slate-300 text-[11px]">
              Meta meneruskan pesan ke endpoint <code className="text-amber-400">/api/webhooks/whatsapp</code>.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">3. Agen AI Menjawab</span>
            <p className="text-slate-300 text-[11px]">
              ElevenLabs AI Agent memproses pesan dan mengirim balasan ramah kembali ke WhatsApp pelanggan.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">4. Notifikasi ke Admin</span>
            <p className="text-slate-300 text-[11px]">
              Saat pelanggan deal memesan ritase, notifikasi order instan dikirim ke nomor WhatsApp admin!
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Meta Webhook Setup & Chat Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Meta & ElevenLabs Settings (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Meta Webhook Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Konfigurasi Webhook Masuk di Meta for Developers
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daftarkan URL callback ini di portal Meta Developer agar Meta mengirim pesan chat pelanggan ke sistem.
              </p>
            </div>

            <div className="space-y-3">
              {/* Callback URL */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  CALLBACK URL (WEBHOOK URL META)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inboundWebhookUrl}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inboundWebhookUrl, setCopiedUrl)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                    title="Salin Webhook URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  VERIFY TOKEN (TOKEN VERIFIKASI META)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verifyToken, setCopiedToken)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                    title="Salin Verify Token"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan token yang sama di kolom <em>Verify token</em> pada dashboard Meta Developer.
                </p>
              </div>

              {/* Webhook Fields instruction */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1">
                <strong className="text-white block">Centang Subscription Field:</strong>
                <p className="text-slate-400 text-[11px]">
                  Di Meta Developer &rarr; WhatsApp &rarr; Configuration &rarr; Webhook fields, klik <strong>Manage</strong> lalu centang <code className="text-amber-400">messages</code>.
                </p>
              </div>
            </div>
          </div>

          {/* ElevenLabs Agent Credentials Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                Pengaturan Kredensial ElevenLabs Conversational AI
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hubungkan ID Agen Conversational AI dari dashboard ElevenLabs Anda.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ElevenLabs Agent ID (Opsional)
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Contoh: agent_01k4d92..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Didapat dari menu <em>Conversational AI &rarr; Agents</em> di dashboard ElevenLabs.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    ElevenLabs API Key
                  </label>
                  {config?.elevenlabsApiKeySet && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Aktif: {config.elevenlabsApiKeyMasked}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    config?.elevenlabsApiKeySet
                      ? '•••••••••••••••• (Kosongkan jika tidak ingin mengubah)'
                      : 'Masukkan xi-api-key...'
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Status Note */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-200 leading-relaxed space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Otomasi Balasan ElevenLabs AI Agent:</span>
                </div>
                <p className="text-slate-300">
                  Setiap pesan WhatsApp yang dikirim pelanggan akan <strong>diteruskan langsung ke ElevenLabs Conversational AI Agent</strong> Anda. Jawaban dari ElevenLabs kemudian dikirimkan kembali secara otomatis ke chat WhatsApp pelanggan.
                </p>
                <p className="text-slate-400 text-[10px]">
                  Jika ID Agen ElevenLabs belum diset, sistem secara otomatis menggunakan fallback Gemini AI &amp; IndoPlangsir Intelligence agar pelanggan tetap terlayani 24/7.
                </p>
              </div>

              {saveMsg && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    saveMsg.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {saveMsg.text}
                </div>
              )}

              <div className="pt-1 text-right">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 ml-auto transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi Chat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Test & Chat Simulator (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Panel with Mode Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Pengujian Balasan AI WhatsApp
                </h3>
              </div>
              {/* Tab Selector: Live WhatsApp vs Simulator */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRightTabMode('live_whatsapp')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    rightTabMode === 'live_whatsapp'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>WhatsApp Asli (HP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTabMode('simulator')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    rightTabMode === 'simulator'
                      ? 'bg-slate-800 text-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Simulator Web</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LIVE WHATSAPP PHONE TEST (BUKAN SIMULATOR) */}
            {rightTabMode === 'live_whatsapp' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Mode Kirim WhatsApp Langsung Aktif</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Sistem ini mengirim balasan AI secara <strong>nyata ke aplikasi WhatsApp di nomor ponsel Anda</strong> melalui Meta WhatsApp Business Cloud API (bukan cuma simulasi web).
                  </p>
                </div>

                <form onSubmit={handleLiveWhatsAppTest} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nomor WhatsApp Tujuan (Ponsel Anda / Admin)
                    </label>
                    <input
                      type="text"
                      value={liveRecipient}
                      onChange={(e) => setLiveRecipient(e.target.value)}
                      placeholder="Contoh: 6281234567890 (format internasional tanpa +)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pastikan nomor diawali kode negara 62 (contoh: 6281234567890).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pesan Pertanyaan Pelanggan (Prompt Uji)
                    </label>
                    <textarea
                      rows={2}
                      value={liveTestPrompt}
                      onChange={(e) => setLiveTestPrompt(e.target.value)}
                      placeholder="Ketik pertanyaan calon pemesan tanah urug / buang puing..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Prompts */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Berapa harga tanah urug merah 5 rit ke Bekasi?',
                      'Bisa buang puing proyek 3 rit hari ini di Jaksel?',
                      'Berapa kapasitas dump truck tronton & colt diesel?',
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLiveTestPrompt(sample)}
                        className="text-[10px] px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={sendingLiveWA || !liveRecipient.trim()}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {sendingLiveWA ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>AI Memproses & Mengirim ke WhatsApp HP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span>Kirim Balasan AI Langsung ke WhatsApp Ponsel Saya</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Result Box */}
                {liveWAResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      liveWAResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {liveWAResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-white">
                          {liveWAResult.success ? 'Berhasil Terkirim ke WhatsApp!' : 'Pengiriman WhatsApp Gagal'}
                        </div>
                        <p className="leading-relaxed">{liveWAResult.message}</p>
                        {liveWAResult.whatsappMessageId && (
                          <div className="text-[10px] font-mono text-emerald-400 bg-slate-950/80 p-1.5 rounded mt-1">
                            Message ID Meta: {liveWAResult.whatsappMessageId}
                          </div>
                        )}
                        {liveWAResult.replyText && (
                          <div className="mt-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-200 whitespace-pre-wrap">
                            <span className="text-amber-400 block font-semibold mb-1">
                              Isi Pesan WhatsApp yang Terkirim ke Ponsel:
                            </span>
                            {liveWAResult.replyText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirement Checklist for Production Two-Way WhatsApp */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Syarat Chat Masuk dari WhatsApp Otomatis Dibalas:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                    <li>
                      Di <strong>Meta Developers &rarr; WhatsApp &rarr; Configuration</strong>, pastikan Webhook URL sudah terverifikasi.
                    </li>
                    <li>
                      Pada bagian <strong>Webhook fields</strong>, klik <strong>Manage</strong> dan pastikan field <code className="text-emerald-400">messages</code> dicentang <strong>Subscribed</strong>.
                    </li>
                    <li>
                      Variabel <code className="text-amber-400">WHATSAPP_PHONE_NUMBER_ID</code> dan <code className="text-amber-400">WHATSAPP_ACCESS_TOKEN</code> sudah aktif di server / Vercel.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: WEB SIMULATOR */}
            {rightTabMode === 'simulator' && (
              <div className="space-y-4">
                {/* Chat Screen Mockup */}
                <div className="bg-[#0b141a] border border-slate-800 rounded-xl overflow-hidden shadow-inner flex flex-col h-[320px]">
                  {/* Chat Header */}
                  <div className="bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3 border-b border-slate-800/80">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                      IP
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">IndoPlangsir AI Assistant</div>
                      <div className="text-[10px] text-emerald-400">Online &bull; Siap melayani order</div>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs">
                    {simulatedChatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-2.5 shadow-sm text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user'
                              ? 'bg-[#005c4b] text-white rounded-tr-none'
                              : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/40'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}
                    {sendingChat && (
                      <div className="flex items-start">
                        <div className="bg-[#202c33] text-slate-300 rounded-lg rounded-tl-none p-2 text-xs flex items-center gap-1.5 border border-slate-700/40">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                          <span>Mengetik balasan...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendSimulatedMessage} className="p-2 bg-[#1f2c34] border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ketik pesan pelanggan (misal: Mau tanya harga urug tanah)..."
                      className="flex-1 px-3 py-1.5 bg-[#2a3942] border border-transparent rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingChat || !chatInput.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Inbound Customer Interaction Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Riwayat Interaksi Chat WhatsApp Masuk (In-Memory Stream)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pesan masuk dari pelanggan WhatsApp yang diproses oleh AI Agent secara otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              type="button"
              onClick={handleClearChatHistory}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        {chatLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/60">
            Belum ada pesan WhatsApp masuk dari pelanggan. Coba kirim pesan melalui simulator di atas atau kirim chat ke nomor WhatsApp Business Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Waktu</th>
                  <th className="py-2.5 px-3 font-medium">Pelanggan</th>
                  <th className="py-2.5 px-3 font-medium">Pesan Pelanggan</th>
                  <th className="py-2.5 px-3 font-medium">Balasan AI Agent</th>
                  <th className="py-2.5 px-3 font-medium">Sumber AI</th>
                  <th className="py-2.5 px-3 font-medium">Deteksi Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {chatLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.fromName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{log.fromPhone}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="text-slate-200 line-clamp-2">{log.userMessage}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="text-slate-300 text-[11px] line-clamp-2">{log.agentReply}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-amber-400">
                        {log.agentSource === 'elevenlabs' ? 'ElevenLabs' : 'IndoPlangsir AI'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.orderDetected ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Order Terdeteksi
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Konsultasi / Tanya</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
