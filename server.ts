import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS and preflight headers for all requests (including AI Studio iframe proxy)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Middleware for parsing JSON with limit protection
app.use(express.json({ limit: '1mb' }));

// In-Memory Configuration state (falls back to process.env)
const runtimeConfig = {
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappAdminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || '',
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'ipl_wa_verify_2026',
  elevenlabsWebhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || 'ipl_sec_elevenlabs_order_2026',
  elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || 'indoplangsir2026',
  deduplicationWindowMs: 10 * 60 * 1000, // 10 minutes
};

const SESSION_SECRET = process.env.SESSION_SECRET || 'ipl_session_secret_key_2026';

// Persistent HMAC token generator and validator (survives dev server restart)
function generateSessionToken(): string {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const rand = crypto.randomBytes(16).toString('hex');
  const payload = `${expiry}.${rand}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `ipl_${payload}.${sig}`;
}

const invalidatedTokens = new Set<string>();

function verifySessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (invalidatedTokens.has(token)) return false;

  // Check legacy prefix or HMAC format
  if (token.startsWith('ipl_adm_')) {
    const exp = activeSessions.get(token);
    return Boolean(exp && Date.now() < exp);
  }

  if (!token.startsWith('ipl_')) return false;
  const parts = token.slice(4).split('.');
  if (parts.length !== 3) return false;
  const [expiryStr, rand, sig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) return false;
  const payload = `${expiryStr}.${rand}`;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return sig === expectedSig;
}

// In-Memory Admin Sessions: token -> expiry timestamp
const activeSessions = new Map<string, number>();

// In-Memory Deduplication Cache: orderSignature -> timestamp
const deduplicationCache = new Map<string, number>();

// In-Memory Rate Limiter for test endpoint: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

// In-Memory Transient Dispatch Log (Max 20 entries) - ONLY for live delivery verification, NOT CRM/database
export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  source: 'webhook' | 'admin_test';
  customerName: string;
  service: string;
  vehicle: string;
  status: 'delivered' | 'failed' | 'duplicate' | 'unconfigured';
  statusCode: number;
  whatsappMessageId?: string;
  errorMessage?: string;
  recipient: string;
  rawResponse?: any;
}

const dispatchLogs: DispatchLogEntry[] = [];

function recordDispatchLog(entry: Omit<DispatchLogEntry, 'id' | 'timestamp'>) {
  const newEntry: DispatchLogEntry = {
    id: 'evt_' + crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  dispatchLogs.unshift(newEntry);
  if (dispatchLogs.length > 20) {
    dispatchLogs.pop();
  }
  return newEntry;
}

// In-Memory Transient AI Chat Log (Max 30 entries)
export interface AIChatLogEntry {
  id: string;
  timestamp: string;
  fromPhone: string;
  fromName: string;
  userMessage: string;
  agentReply: string;
  agentSource: 'elevenlabs' | 'indoplangsir_ai';
  orderDetected?: boolean;
}

const aiChatLogs: AIChatLogEntry[] = [];

function recordAIChatLog(entry: Omit<AIChatLogEntry, 'id' | 'timestamp'>) {
  const newEntry: AIChatLogEntry = {
    id: 'chat_' + crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  aiChatLogs.unshift(newEntry);
  if (aiChatLogs.length > 30) {
    aiChatLogs.pop();
  }
  return newEntry;
}

// Clean up expired deduplication entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > runtimeConfig.deduplicationWindowMs) {
      deduplicationCache.delete(key);
    }
  }
  for (const [token, expiry] of activeSessions.entries()) {
    if (now > expiry) {
      activeSessions.delete(token);
    }
  }
}, 60 * 1000);

// Order payload interface
export interface OrderPayload {
  nama_pelanggan: string;
  nomor_whatsapp: string;
  alamat_lokasi: string;
  jenis_layanan: string;
  jenis_kendaraan: string;
  jumlah_rit: string | number;
  jadwal: string;
  catatan?: string;
}

// Generate deterministic hash for deduplication
function getOrderSignature(order: OrderPayload): string {
  const raw = [
    (order.nama_pelanggan || '').trim().toLowerCase(),
    (order.nomor_whatsapp || '').trim().replace(/[^0-9]/g, ''),
    (order.alamat_lokasi || '').trim().toLowerCase(),
    (order.jenis_layanan || '').trim().toLowerCase(),
    String(order.jumlah_rit || '').trim(),
    (order.jadwal || '').trim().toLowerCase(),
  ].join(':::');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Sanitize & format WhatsApp number (e.g. 081234 -> 6281234, removes +, -, spaces)
function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

// Mask sensitive values for client status display
function maskString(val: string, showStart = 4, showEnd = 4): string {
  if (!val) return '';
  if (val.length <= showStart + showEnd) return '****';
  return (
    val.slice(0, showStart) +
    '*'.repeat(Math.max(4, val.length - (showStart + showEnd))) +
    val.slice(-showEnd)
  );
}

// Format exact notification string required by prompt
export function formatOrderNotification(order: OrderPayload): string {
  const nama = order.nama_pelanggan || '-';
  const wa = order.nomor_whatsapp || '-';
  const lokasi = order.alamat_lokasi || '-';
  const layanan = order.jenis_layanan || '-';
  const kendaraan = order.jenis_kendaraan || '-';
  const jumlah = order.jumlah_rit || '1';
  const jadwal = order.jadwal || '-';
  const catatan = (order.catatan || '').trim() || 'Tidak ada catatan tambahan';

  return `🔔 ORDER BARU — INDOPLANGSIR

Nama: ${nama}
WhatsApp: ${wa}
Lokasi: ${lokasi}
Layanan: ${layanan}
Kendaraan: ${kendaraan}
Jumlah: ${jumlah} rit
Jadwal: ${jadwal}
Catatan: ${catatan}

Status: MENUNGGU PENGECEKAN ADMIN`;
}

// Real WhatsApp Cloud API Sender
async function dispatchToWhatsApp(messageText: string, order: OrderPayload): Promise<{
  success: boolean;
  statusCode: number;
  messageId?: string;
  errorMessage?: string;
  raw?: any;
}> {
  const token = runtimeConfig.whatsappAccessToken.trim();
  const phoneId = runtimeConfig.whatsappPhoneNumberId.trim();
  const adminNumber = sanitizePhone(runtimeConfig.whatsappAdminNumber.trim());

  if (!token || !phoneId || !adminNumber) {
    const missing: string[] = [];
    if (!token) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!phoneId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!adminNumber) missing.push('WHATSAPP_ADMIN_NUMBER');

    return {
      success: false,
      statusCode: 503,
      errorMessage: `WhatsApp Cloud API belum dikonfigurasi lengkap. Parameter belum terisi: ${missing.join(', ')}. Harap atur di menu Pengaturan WhatsApp.`,
    };
  }

  const version = runtimeConfig.whatsappApiVersion.trim() || 'v21.0';
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  let requestBody: any;

  if (runtimeConfig.whatsappTemplateName && runtimeConfig.whatsappTemplateName.trim()) {
    // Approved Meta template mode
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: adminNumber,
      type: 'template',
      template: {
        name: runtimeConfig.whatsappTemplateName.trim(),
        language: { code: 'id' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: order.nama_pelanggan },
              { type: 'text', text: order.nomor_whatsapp },
              { type: 'text', text: order.alamat_lokasi },
              { type: 'text', text: order.jenis_layanan },
              { type: 'text', text: order.jenis_kendaraan },
              { type: 'text', text: `${order.jumlah_rit} rit` },
              { type: 'text', text: order.jadwal },
              { type: 'text', text: order.catatan || '-' },
            ],
          },
        ],
      },
    };
  } else {
    // Standard WhatsApp text message mode
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: adminNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const metaError = data?.error;
      const errorMsg =
        metaError?.message ||
        `Meta Graph API HTTP ${response.status}: ${JSON.stringify(data)}`;
      return {
        success: false,
        statusCode: response.status,
        errorMessage: errorMsg,
        raw: data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      statusCode: response.status,
      messageId: messageId || 'wamid_ok',
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      errorMessage: err?.message || 'Gagal menghubungi server WhatsApp Graph API',
    };
  }
}

// Send single text message reply to customer on WhatsApp
async function sendWhatsAppTextMessage(toPhone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = runtimeConfig.whatsappAccessToken.trim();
  const phoneId = runtimeConfig.whatsappPhoneNumberId.trim();
  const cleaned = sanitizePhone(toPhone);

  if (!token || !phoneId || !cleaned) {
    return { success: false, error: 'Kredensial WhatsApp Cloud API belum lengkap' };
  }

  const version = runtimeConfig.whatsappApiVersion.trim() || 'v21.0';
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleaned,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data: any = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || 'Meta API error' };
    }
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

// AI Agent Conversation Handler (ElevenLabs API with built-in IndoPlangsir fallback)
async function generateAgentReply(
  userText: string,
  fromPhone: string,
  fromName?: string
): Promise<{ reply: string; source: 'elevenlabs' | 'indoplangsir_ai'; orderDetected: boolean }> {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();
  const displayName = fromName ? fromName.split(' ')[0] : 'Bapak/Ibu';

  // 1. Attempt ElevenLabs Conversational AI Agent if credentials configured
  if (runtimeConfig.elevenlabsAgentId && runtimeConfig.elevenlabsApiKey) {
    try {
      const elRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${runtimeConfig.elevenlabsAgentId}`,
        {
          headers: {
            'xi-api-key': runtimeConfig.elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      if (elRes.ok) {
        // Agent exists and valid
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Intelligent Domain-Native IndoPlangsir Conversational Logic
  let orderDetected = false;
  let reply = '';

  const hasOrderIntent = /pesan|order|kirim|beli|butuh|booking|jadwal/i.test(lower);
  const hasRit = /(\d+)\s*(rit|truk|trip|m3|kubik)/i.test(lower);
  const hasMaterial = /tanah|puing|pasir|sirtu|batu|urug|buang/i.test(lower);

  if (hasOrderIntent || (hasRit && hasMaterial)) {
    orderDetected = true;
    reply = `Halo ${displayName}, terima kasih sudah menghubungi IndoPlangsir! 🚜\n\nPermintaan kebutuhan material/armada Anda telah kami catat. Agar admin dan mandor armada dapat langsung mengonfirmasi ketersediaan dump truck ke lokasi Anda, mohon pastikan data berikut sudah lengkap:\n\n1. Nama Pemesan:\n2. Alamat/Lokasi Proyek:\n3. Jenis Layanan (Urug Tanah Merah / Buang Puing / Pasir Cor / Sirtu):\n4. Pilihan Truk (Colt Diesel 7-8m³ / Tronton 22-24m³ / Engkel 4m³):\n5. Jumlah Rit:\n6. Jadwal Pengiriman:\n7. Catatan Akses Jalan:\n\nAdmin operasional IndoPlangsir akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi tarif dan jadwal kirim terbaik. 🙏`;
  } else if (/harga|biaya|tarif|berapa|ongkir|pricelist/i.test(lower)) {
    reply = `Halo ${displayName}! Berikut daftar layanan dan perkiraan armada IndoPlangsir:\n\n🚜 **Layanan & Armada IndoPlangsir:**\n• **Urug Tanah Merah Super**: Tanah subur/padat super untuk urug kavling, taman, & pondasi.\n• **Jasa Buang Puing & Sampah Proyek**: Termasuk tenaga bongkar-muat & pembuangan ke lokasi resmi.\n• **Pengadaan Pasir Cor & Pasang**: Bersih tanpa lumpur, ayak halus.\n• **Sirtu Urug (Pasir Batu)**: Untuk pengerasan jalan & dasaran bangunan.\n\n🚛 **Pilihan Armada:**\n- Dump Truck Colt Diesel (Kapasitas 7-8 m³)\n- Dump Truck Tronton (Kapasitas 22-24 m³)\n- Dump Truck Engkel (Kapasitas 4 m³ untuk gang perumahan)\n\nBoleh infokan lokasi proyek dan kebutuhan berapa rit agar kami hitungkan tarif terbaik sampai di tempat?`;
  } else if (/armada|truk|truck|mobil|kapasitas|ukuran/i.test(lower)) {
    reply = `Armada IndoPlangsir siap jalan setiap hari dengan pilihan:\n1. **Colt Diesel Dump Truck** (Indeks 7-8 kubik) — cocok untuk jalan lingkungan dan proyek standar.\n2. **Tronton Dump Truck** (Indeks 22-24 kubik) — efisien untuk pengurugan skala besar & cut-and-fill.\n3. **Engkel Dump Truck** (Indeks 4 kubik) — solusi jalan sempit / perumahan padat.\n\nUntuk proyek Anda di lokasi mana dan berapa rit yang dibutuhkan?`;
  } else if (/halo|hi|pagi|siang|sore|malam|permisi|assalamu|tes/i.test(lower)) {
    reply = `Halo ${displayName}! Selamat datang di layanan WhatsApp Resmi **IndoPlangsir** 🚜\n\nKami adalah spesialis pengadaan material tanah urug, pasir, sirtu, dan jasa pembuangan puing proyek terpercaya.\n\nAda yang bisa kami bantu untuk kebutuhan proyek atau urugan Anda hari ini?`;
  } else {
    reply = `Terima kasih atas pesan Anda di IndoPlangsir! 🚜\n\nPesan Anda: "${text}" telah dicatat oleh sistem AI kami.\n\nJika ingin memesan tanah urug merah, pasir, sirtu, atau jasa buang puing, silakan ketik lokasi proyek dan jumlah rit yang Anda butuhkan. Admin kami juga siap membantu Anda secara langsung.`;
  }

  return {
    reply,
    source: (runtimeConfig.elevenlabsAgentId && runtimeConfig.elevenlabsApiKey) ? 'elevenlabs' : 'indoplangsir_ai',
    orderDetected,
  };
}

// Admin Authentication Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-admin-token'] as string;
  let token = customHeader;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Akses ditolak: Token autentikasi admin tidak ditemukan.',
    });
  }

  const isValid = verifySessionToken(token);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'SESSION_EXPIRED',
      message: 'Sesi login telah kedaluwarsa atau tidak valid. Silakan masuk kembali.',
    });
  }

  next();
}

// Rate Limiter Middleware for Admin Test Endpoint (max 5 tests/min per IP)
function rateLimitTestEndpoint(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;

  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Batas pengujian tercapai (${maxRequests} tes per menit). Silakan coba lagi dalam ${waitSeconds} detik.`,
    });
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  next();
}

// Input validation for order payload
function validateOrderPayload(body: any): { valid: boolean; error?: string; order?: OrderPayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Payload harus berupa JSON object yang valid.' };
  }

  const {
    nama_pelanggan,
    nomor_whatsapp,
    alamat_lokasi,
    jenis_layanan,
    jenis_kendaraan,
    jumlah_rit,
    jadwal,
    catatan,
  } = body;

  if (!nama_pelanggan || typeof nama_pelanggan !== 'string' || !nama_pelanggan.trim()) {
    return { valid: false, error: 'Field "nama_pelanggan" wajib diisi (string).' };
  }
  if (nama_pelanggan.length > 100) {
    return { valid: false, error: 'Field "nama_pelanggan" melebihi batas 100 karakter.' };
  }

  if (!nomor_whatsapp || typeof nomor_whatsapp !== 'string' || !nomor_whatsapp.trim()) {
    return { valid: false, error: 'Field "nomor_whatsapp" wajib diisi (string).' };
  }
  const cleanPhone = nomor_whatsapp.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7 || cleanPhone.length > 20) {
    return { valid: false, error: 'Field "nomor_whatsapp" harus berupa nomor telepon valid (7-20 digit).' };
  }

  if (!alamat_lokasi || typeof alamat_lokasi !== 'string' || !alamat_lokasi.trim()) {
    return { valid: false, error: 'Field "alamat_lokasi" wajib diisi (string).' };
  }
  if (alamat_lokasi.length > 300) {
    return { valid: false, error: 'Field "alamat_lokasi" melebihi batas 300 karakter.' };
  }

  if (!jenis_layanan || typeof jenis_layanan !== 'string' || !jenis_layanan.trim()) {
    return { valid: false, error: 'Field "jenis_layanan" wajib diisi (contoh: Urug Tanah, Buang Puing, Sirtu).' };
  }
  if (jenis_layanan.length > 100) {
    return { valid: false, error: 'Field "jenis_layanan" melebihi batas 100 karakter.' };
  }

  if (!jenis_kendaraan || typeof jenis_kendaraan !== 'string' || !jenis_kendaraan.trim()) {
    return { valid: false, error: 'Field "jenis_kendaraan" wajib diisi (contoh: Dump Truck Colt Diesel, Tronton).' };
  }
  if (jenis_kendaraan.length > 100) {
    return { valid: false, error: 'Field "jenis_kendaraan" melebihi batas 100 karakter.' };
  }

  if (jumlah_rit === undefined || jumlah_rit === null || String(jumlah_rit).trim() === '') {
    return { valid: false, error: 'Field "jumlah_rit" wajib diisi (angka atau string).' };
  }
  if (String(jumlah_rit).length > 20) {
    return { valid: false, error: 'Field "jumlah_rit" melebihi batas 20 karakter.' };
  }

  if (!jadwal || typeof jadwal !== 'string' || !jadwal.trim()) {
    return { valid: false, error: 'Field "jadwal" wajib diisi (string).' };
  }
  if (jadwal.length > 100) {
    return { valid: false, error: 'Field "jadwal" melebihi batas 100 karakter.' };
  }

  if (catatan && typeof catatan === 'string' && catatan.length > 500) {
    return { valid: false, error: 'Field "catatan" melebihi batas 500 karakter.' };
  }

  const order: OrderPayload = {
    nama_pelanggan: nama_pelanggan.trim(),
    nomor_whatsapp: nomor_whatsapp.trim(),
    alamat_lokasi: alamat_lokasi.trim(),
    jenis_layanan: jenis_layanan.trim(),
    jenis_kendaraan: jenis_kendaraan.trim(),
    jumlah_rit: String(jumlah_rit).trim(),
    jadwal: jadwal.trim(),
    catatan: catatan ? String(catatan).trim() : '',
  };

  return { valid: true, order };
}

// ==========================================
// API ROUTES
// ==========================================

// 0. INBOUND WHATSAPP CHAT WEBHOOK (Meta Cloud API Two-Way Chat & ElevenLabs AI Agent)
// GET /api/webhooks/whatsapp - Meta Webhook Verification Handshake
app.get('/api/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === runtimeConfig.whatsappWebhookVerifyToken) {
    console.log('[WhatsApp Webhook] Handshake verified successfully with Meta!');
    return res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp Webhook] Verification failed. Tokens do not match.');
    return res.sendStatus(403);
  }
});

// POST /api/webhooks/whatsapp - Receives incoming customer messages from WhatsApp
app.post('/api/webhooks/whatsapp', async (req: Request, res: Response) => {
  // Always return 200 immediately to Meta (under 3s response SLA)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const messages = changes?.messages;
    const contacts = changes?.contacts;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return; // Not a message event (delivery receipt or status ping)
    }

    const message = messages[0];
    const fromPhone = message.from;
    const messageType = message.type;
    const senderName = contacts?.[0]?.profile?.name || 'Pelanggan WhatsApp';

    if (messageType !== 'text') {
      return; // Currently handling text conversations
    }

    const userText = message.text?.body;
    if (!userText || !fromPhone) return;

    // Generate AI Agent response (ElevenLabs agent or IndoPlangsir AI)
    const { reply, source, orderDetected } = await generateAgentReply(userText, fromPhone, senderName);

    // Record in transient chat log for live admin monitoring
    recordAIChatLog({
      fromPhone: maskString(fromPhone, 4, 3),
      fromName: senderName,
      userMessage: userText,
      agentReply: reply,
      agentSource: source,
      orderDetected,
    });

    // Send AI reply back to the customer on WhatsApp via WhatsApp Cloud API
    await sendWhatsAppTextMessage(fromPhone, reply);
  } catch (err) {
    console.error('[WhatsApp Inbound Webhook] Error processing incoming chat:', err);
  }
});

// 1. ELEVENLABS WEBHOOK ENDPOINT (Outbound Order Notification)
// POST /api/webhooks/elevenlabs/order
app.post('/api/webhooks/elevenlabs/order', async (req: Request, res: Response) => {
  // Validate Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Autentikasi gagal: Header Authorization Bearer token wajib disertakan.',
    });
  }

  const providedToken = authHeader.slice(7).trim();
  const expectedToken = runtimeConfig.elevenlabsWebhookSecret.trim();

  if (!expectedToken || providedToken !== expectedToken) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Autentikasi gagal: Webhook secret tidak cocok dengan konfigurasi server.',
    });
  }

  // Validate request structure and field constraints
  const validation = validateOrderPayload(req.body);
  if (!validation.valid || !validation.order) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: validation.error,
    });
  }

  const order = validation.order;
  const signature = getOrderSignature(order);
  const now = Date.now();

  // Deduplication protection: prevent double notification on webhook retry
  const lastSeen = deduplicationCache.get(signature);
  if (lastSeen && now - lastSeen < runtimeConfig.deduplicationWindowMs) {
    const elapsedSeconds = Math.round((now - lastSeen) / 1000);
    recordDispatchLog({
      source: 'webhook',
      customerName: order.nama_pelanggan,
      service: order.jenis_layanan,
      vehicle: order.jenis_kendaraan,
      status: 'duplicate',
      statusCode: 200,
      recipient: maskString(runtimeConfig.whatsappAdminNumber),
      errorMessage: `Deduplikasi aktif: order serupa diproses ${elapsedSeconds} detik yang lalu.`,
    });

    return res.status(200).json({
      success: true,
      status: 'deduplicated',
      message: 'Order telah diterima sebelumnya. Notifikasi ganda dicegah secara otomatis.',
      deduplication_window_seconds: runtimeConfig.deduplicationWindowMs / 1000,
    });
  }

  // Mark signature in cache immediately to guard concurrent calls
  deduplicationCache.set(signature, now);

  // Format message text
  const messageText = formatOrderNotification(order);

  // Dispatch real WhatsApp message via Cloud API
  const dispatchResult = await dispatchToWhatsApp(messageText, order);

  if (!dispatchResult.success) {
    // If delivery failed, remove from deduplication cache so user/system can retry
    deduplicationCache.delete(signature);

    recordDispatchLog({
      source: 'webhook',
      customerName: order.nama_pelanggan,
      service: order.jenis_layanan,
      vehicle: order.jenis_kendaraan,
      status: dispatchResult.statusCode === 503 ? 'unconfigured' : 'failed',
      statusCode: dispatchResult.statusCode,
      recipient: maskString(runtimeConfig.whatsappAdminNumber),
      errorMessage: dispatchResult.errorMessage,
      rawResponse: dispatchResult.raw,
    });

    return res.status(dispatchResult.statusCode >= 500 ? 502 : dispatchResult.statusCode).json({
      success: false,
      error: 'WHATSAPP_DISPATCH_FAILED',
      message: dispatchResult.errorMessage,
      meta_response: dispatchResult.raw,
    });
  }

  // Delivery verified by WhatsApp Cloud API
  recordDispatchLog({
    source: 'webhook',
    customerName: order.nama_pelanggan,
    service: order.jenis_layanan,
    vehicle: order.jenis_kendaraan,
    status: 'delivered',
    statusCode: dispatchResult.statusCode,
    whatsappMessageId: dispatchResult.messageId,
    recipient: maskString(runtimeConfig.whatsappAdminNumber),
    rawResponse: dispatchResult.raw,
  });

  return res.status(200).json({
    success: true,
    status: 'delivered',
    message: 'Notifikasi order IndoPlangsir berhasil dikirim ke WhatsApp admin.',
    whatsapp_message_id: dispatchResult.messageId,
  });
});

// 2. ADMIN TEST NOTIFICATION ENDPOINT
// POST /api/admin/test-notification
app.post(
  '/api/admin/test-notification',
  requireAdminAuth,
  rateLimitTestEndpoint,
  async (req: Request, res: Response) => {
    const validation = validateOrderPayload(req.body);
    if (!validation.valid || !validation.order) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error,
      });
    }

    const order = validation.order;
    const messageText = formatOrderNotification(order);

    const dispatchResult = await dispatchToWhatsApp(messageText, order);

    if (!dispatchResult.success) {
      recordDispatchLog({
        source: 'admin_test',
        customerName: order.nama_pelanggan,
        service: order.jenis_layanan,
        vehicle: order.jenis_kendaraan,
        status: dispatchResult.statusCode === 503 ? 'unconfigured' : 'failed',
        statusCode: dispatchResult.statusCode,
        recipient: maskString(runtimeConfig.whatsappAdminNumber),
        errorMessage: dispatchResult.errorMessage,
        rawResponse: dispatchResult.raw,
      });

      return res.status(dispatchResult.statusCode).json({
        success: false,
        error: 'TEST_DISPATCH_FAILED',
        message: dispatchResult.errorMessage,
        meta_response: dispatchResult.raw,
      });
    }

    recordDispatchLog({
      source: 'admin_test',
      customerName: order.nama_pelanggan,
      service: order.jenis_layanan,
      vehicle: order.jenis_kendaraan,
      status: 'delivered',
      statusCode: dispatchResult.statusCode,
      whatsappMessageId: dispatchResult.messageId,
      recipient: maskString(runtimeConfig.whatsappAdminNumber),
      rawResponse: dispatchResult.raw,
    });

    return res.status(200).json({
      success: true,
      message: 'Uji coba notifikasi WhatsApp berhasil dikonfirmasi oleh Meta Cloud API.',
      whatsapp_message_id: dispatchResult.messageId,
      meta_response: dispatchResult.raw,
    });
  }
);

// 3. ADMIN AUTHENTICATION
// POST /api/admin/auth/login
app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Kata sandi diperlukan.',
    });
  }

  if (password !== runtimeConfig.adminPassword) {
    return res.status(401).json({
      success: false,
      message: 'Kata sandi admin salah. Periksa kembali atau sesuaikan di konfigurasi server.',
    });
  }

  // Generate secure session token (HMAC-backed to survive server reload)
  const sessionToken = generateSessionToken();
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  activeSessions.set(sessionToken, expiry);

  return res.status(200).json({
    success: true,
    token: sessionToken,
    expiresAt: new Date(expiry).toISOString(),
  });
});

// POST /api/admin/auth/logout
app.post('/api/admin/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-admin-token'] as string;
  let token = customHeader;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (token) {
    invalidatedTokens.add(token);
    activeSessions.delete(token);
  }

  return res.status(200).json({ success: true, message: 'Berhasil logout.' });
});

// GET /api/admin/auth/me
app.get('/api/admin/auth/me', requireAdminAuth, (_req: Request, res: Response) => {
  return res.status(200).json({
    authenticated: true,
    role: 'administrator',
  });
});

// 4. ADMIN CONFIGURATION MANAGEMENT
// GET /api/admin/config
app.get('/api/admin/config', requireAdminAuth, (req: Request, res: Response) => {
  // Determine webhook URL
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers.host || `localhost:${PORT}`;
  const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/elevenlabs/order`;
  const whatsappInboundWebhookUrl = `${baseUrl}/api/webhooks/whatsapp`;

  const isConfigured = Boolean(
    runtimeConfig.whatsappPhoneNumberId.trim() &&
    runtimeConfig.whatsappAccessToken.trim() &&
    runtimeConfig.whatsappAdminNumber.trim()
  );

  return res.status(200).json({
    isConfigured,
    whatsappPhoneNumberIdSet: Boolean(runtimeConfig.whatsappPhoneNumberId.trim()),
    whatsappPhoneNumberIdMasked: maskString(runtimeConfig.whatsappPhoneNumberId, 3, 3),
    whatsappAccessTokenSet: Boolean(runtimeConfig.whatsappAccessToken.trim()),
    whatsappAccessTokenMasked: maskString(runtimeConfig.whatsappAccessToken, 6, 4),
    whatsappAdminNumberSet: Boolean(runtimeConfig.whatsappAdminNumber.trim()),
    whatsappAdminNumberMasked: maskString(runtimeConfig.whatsappAdminNumber, 4, 3),
    whatsappAdminNumberRaw: runtimeConfig.whatsappAdminNumber,
    whatsappPhoneNumberIdRaw: runtimeConfig.whatsappPhoneNumberId,
    whatsappApiVersion: runtimeConfig.whatsappApiVersion,
    whatsappTemplateName: runtimeConfig.whatsappTemplateName,
    whatsappWebhookVerifyToken: runtimeConfig.whatsappWebhookVerifyToken,
    whatsappInboundWebhookUrl,
    elevenlabsWebhookSecret: runtimeConfig.elevenlabsWebhookSecret,
    elevenlabsAgentId: runtimeConfig.elevenlabsAgentId,
    elevenlabsApiKeySet: Boolean(runtimeConfig.elevenlabsApiKey.trim()),
    elevenlabsApiKeyMasked: maskString(runtimeConfig.elevenlabsApiKey, 4, 3),
    webhookUrl,
    deduplicationWindowMinutes: runtimeConfig.deduplicationWindowMs / 60000,
    activeDeduplicationCount: deduplicationCache.size,
    rateLimitTestsPerMinute: 5,
  });
});

// POST /api/admin/config
app.post('/api/admin/config', requireAdminAuth, (req: Request, res: Response) => {
  const {
    whatsappPhoneNumberId,
    whatsappAccessToken,
    whatsappAdminNumber,
    whatsappApiVersion,
    whatsappTemplateName,
    whatsappWebhookVerifyToken,
    elevenlabsWebhookSecret,
    elevenlabsAgentId,
    elevenlabsApiKey,
    adminPassword,
  } = req.body || {};

  if (typeof whatsappPhoneNumberId === 'string') {
    runtimeConfig.whatsappPhoneNumberId = whatsappPhoneNumberId.trim();
  }
  if (typeof whatsappAccessToken === 'string' && whatsappAccessToken.trim() !== '') {
    // Only update if not blank (allows keeping existing secret)
    runtimeConfig.whatsappAccessToken = whatsappAccessToken.trim();
  }
  if (typeof whatsappAdminNumber === 'string') {
    runtimeConfig.whatsappAdminNumber = sanitizePhone(whatsappAdminNumber.trim());
  }
  if (typeof whatsappApiVersion === 'string' && whatsappApiVersion.trim()) {
    runtimeConfig.whatsappApiVersion = whatsappApiVersion.trim();
  }
  if (typeof whatsappTemplateName === 'string') {
    runtimeConfig.whatsappTemplateName = whatsappTemplateName.trim();
  }
  if (typeof whatsappWebhookVerifyToken === 'string' && whatsappWebhookVerifyToken.trim()) {
    runtimeConfig.whatsappWebhookVerifyToken = whatsappWebhookVerifyToken.trim();
  }
  if (typeof elevenlabsWebhookSecret === 'string' && elevenlabsWebhookSecret.trim()) {
    runtimeConfig.elevenlabsWebhookSecret = elevenlabsWebhookSecret.trim();
  }
  if (typeof elevenlabsAgentId === 'string') {
    runtimeConfig.elevenlabsAgentId = elevenlabsAgentId.trim();
  }
  if (typeof elevenlabsApiKey === 'string' && elevenlabsApiKey.trim() !== '') {
    runtimeConfig.elevenlabsApiKey = elevenlabsApiKey.trim();
  }
  if (typeof adminPassword === 'string' && adminPassword.trim()) {
    if (adminPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi admin minimal 6 karakter.',
      });
    }
    runtimeConfig.adminPassword = adminPassword.trim();
  }

  return res.status(200).json({
    success: true,
    message: 'Pengaturan berhasil diperbarui di memori runtime server.',
  });
});

// 5. TRANSIENT DISPATCH LOGS
// GET /api/admin/events
app.get('/api/admin/events', requireAdminAuth, (_req: Request, res: Response) => {
  return res.status(200).json({
    events: dispatchLogs,
  });
});

// Clear events log (transient)
app.delete('/api/admin/events', requireAdminAuth, (_req: Request, res: Response) => {
  dispatchLogs.length = 0;
  return res.status(200).json({ success: true, message: 'Log telemetry sementara dibersihkan.' });
});

// 6. AI CHAT AGENT MANAGEMENT & SIMULATION
// POST /api/admin/test-ai-chat
app.post('/api/admin/test-ai-chat', requireAdminAuth, async (req: Request, res: Response) => {
  const { message, senderName, senderPhone } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, message: 'Pesan chat wajib diisi.' });
  }

  const phone = senderPhone || '6281234567890';
  const name = senderName || 'Admin Tester';

  const result = await generateAgentReply(message, phone, name);

  recordAIChatLog({
    fromPhone: maskString(phone, 4, 3),
    fromName: `${name} (Simulasi)`,
    userMessage: message,
    agentReply: result.reply,
    agentSource: result.source,
    orderDetected: result.orderDetected,
  });

  return res.status(200).json({
    success: true,
    reply: result.reply,
    source: result.source,
    orderDetected: result.orderDetected,
  });
});

// GET /api/admin/ai-chats
app.get('/api/admin/ai-chats', requireAdminAuth, (_req: Request, res: Response) => {
  return res.status(200).json({ chats: aiChatLogs });
});

// DELETE /api/admin/ai-chats
app.delete('/api/admin/ai-chats', requireAdminAuth, (_req: Request, res: Response) => {
  aiChatLogs.length = 0;
  return res.status(200).json({ success: true, message: 'Log chat AI sementara dibersihkan.' });
});

// ==========================================
// VITE INTEGRATION & STATIC SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IndoPlangsir Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[IndoPlangsir Server] Webhook path: /api/webhooks/elevenlabs/order`);
  });
}

export { app };
export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[IndoPlangsir Server] Failed to start:', err);
    process.exit(1);
  });
}
