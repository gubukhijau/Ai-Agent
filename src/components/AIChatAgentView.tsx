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
import { saveAdminConfig, testAIChat, fetchAIChats, clearAIChats } from '../services/api';

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
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-200 leading-relaxed">
                <strong className="text-white block mb-0.5">Mode Asisten Cerdas Aktif:</strong>
                Meskipun Agent ID ElevenLabs belum diisi, nomor WhatsApp Anda sudah otomatis aktif menjawab pertanyaan pelanggan menggunakan <strong>IndoPlangsir Heavy Equipment Intelligence</strong> (katalog armada, harga ritase, dan pengumpulan 8 data order).
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

        {/* Right Column: Live Chat Simulator & Recent Chats (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* WhatsApp Interactive Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Simulator Chat Pelanggan WhatsApp
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                AI Agent Siap
              </span>
            </div>

            {/* Chat Screen Mockup */}
            <div className="bg-[#0b141a] border border-slate-800 rounded-xl overflow-hidden shadow-inner flex flex-col h-[340px]">
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

            {/* Quick Test Prompt Shortcuts */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Contoh Pertanyaan Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Berapa harga tanah urug per rit?',
                  'Kapasitas dump truck colt diesel berapa kubik?',
                  'Bisa buang puing proyek 3 rit hari ini di Tebet?',
                  'Saya mau pesan tanah merah 8 rit ke Bekasi',
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setChatInput(promptText)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 rounded-md transition-colors"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
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
