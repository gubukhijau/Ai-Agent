import { GoogleGenAI } from '@google/genai';
import { insertChatLogToSupabase, insertOrderToSupabase } from './supabase.ts';

export interface WhatsAppReplyResult {
  processed: boolean;
  fromPhone?: string;
  senderName?: string;
  userMessage?: string;
  replyText?: string;
  whatsappMessageId?: string;
  orderDetected?: boolean;
  error?: string;
}

// Sanitize phone number to international format without + or spaces (e.g. 628123456789)
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
}

// Generate intelligent AI response for IndoPlangsir
export async function generateIndoPlangsirAIReply(
  userText: string,
  fromPhone: string,
  fromName = 'Bapak/Ibu',
  agentConfig?: { elevenlabsAgentId?: string; elevenlabsApiKey?: string }
): Promise<{ reply: string; source: 'gemini' | 'elevenlabs' | 'rule_based'; orderDetected: boolean }> {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();
  const displayName = fromName ? fromName.split(' ')[0] : 'Bapak/Ibu';

  // Check intent for ordering
  const hasOrderIntent = /pesan|order|kirim|beli|butuh|booking|jadwal/i.test(lower);
  const hasRit = /(\d+)\s*(rit|truk|trip|m3|kubik)/i.test(lower);
  const hasMaterial = /tanah|puing|pasir|sirtu|batu|urug|buang/i.test(lower);
  const orderDetected = hasOrderIntent || (hasRit && hasMaterial);

  // 1. Try Gemini AI if API key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({});
      const systemInstruction = `Anda adalah Asisten Customer Service AI resmi dari IndoPlangsir (spesialis pengurugan tanah merah super, jasa buang puing proyek, pasir cor, dan sirtu).
Karakter: Ramah, profesional, sigap, solutif, menggunakan Bahasa Indonesia yang sopan dan natural di WhatsApp. Gunakan emoji secukupnya (🚜, 🚛, 🙏).
Layanan IndoPlangsir:
1. Urug Tanah Merah Super (tanah subur/padat untuk pondasi, taman, kavling).
2. Jasa Buang Puing & Sampah Proyek (termasuk armada & pembuangan resmi).
3. Pasir Cor & Pasir Pasang (bersih, bebas lumpur).
4. Sirtu (Pasir Batu untuk perkerasan jalan proyek).
Armada:
- Colt Diesel Dump Truck (kapasitas 7-8 m³, standar perumahan/jalan sedang).
- Tronton Dump Truck (kapasitas 22-24 m³, proyek skala besar).
- Engkel Dump Truck (kapasitas 4 m³, jalan sempit/gang padat).
Aturan:
- Jika pelanggan ingin memesan atau menanyakan estimasi harga, minta informasi: Nama Pemesan, Alamat/Lokasi Proyek, Jenis Material/Layanan, Pilihan Truk, Jumlah Rit, dan Jadwal Kirim.
- Jawab dengan singkat, padat, dan nyaman dibaca di layar HP WhatsApp (maksimal 2-3 paragraf).
- Jangan menjanjikan harga fiktif tanpa data volume dan jarak lokasi.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Nama customer WhatsApp: ${displayName}. Pesan customer: "${text}". Balas langsung pesan ini sebagai CS WhatsApp IndoPlangsir.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return { reply, source: 'gemini', orderDetected };
      }
    } catch (geminiErr) {
      console.warn('[AI Reply] Gemini API call skipped or failed, falling back to rule engine:', geminiErr);
    }
  }

  // 2. Intelligent Rule-based IndoPlangsir Engine
  let reply = '';
  if (orderDetected) {
    reply = `Halo ${displayName}, terima kasih sudah menghubungi WhatsApp Resmi IndoPlangsir! 🚜\n\nPermintaan pesanan Anda sudah kami catat di sistem operasional. Agar mandor armada kami dapat mengonfirmasi ketersediaan dump truck dan total ritase ke lokasi Anda, mohon lengkapi:\n\n1. Nama Pemesan:\n2. Alamat Proyek:\n3. Jenis Layanan (Urug Tanah / Buang Puing / Pasir Cor / Sirtu):\n4. Armada (Colt Diesel 7-8m³ / Tronton 22-24m³ / Engkel 4m³):\n5. Jumlah Ritase:\n6. Jadwal Pengiriman:\n\nAdmin kami juga akan segera memverifikasi ketersediaan armada langsung ke nomor WhatsApp ini. 🙏`;
  } else if (/harga|biaya|tarif|berapa|ongkir|pricelist/i.test(lower)) {
    reply = `Halo ${displayName}! Berikut layanan dan armada IndoPlangsir:\n\n🚜 **Layanan Material & Jasa:**\n• **Urug Tanah Merah Super**: Padat super untuk urugan tanah & kavling.\n• **Jasa Buang Puing**: Bersih tuntas puing renovasi & sampah proyek.\n• **Pasir Cor & Pasir Pasang**: Pasir kualitas utama bebas lumpur.\n• **Sirtu Urug**: Pilihan terbaik perkerasan jalan proyek.\n\n🚛 **Pilihan Armada:**\n- Dump Truck Colt Diesel (7-8 kubik)\n- Dump Truck Tronton (22-24 kubik)\n- Dump Truck Engkel (4 kubik)\n\nBoleh infokan lokasi proyek dan estimasi berapa rit agar kami hitungkan penawaran terbaik sampai di lokasi?`;
  } else if (/truk|armada|mobil|ukuran|kapasitas/i.test(lower)) {
    reply = `Armada dump truck IndoPlangsir siap kirim setiap hari:\n1. **Colt Diesel** (7-8 m³) — pilihan paling populer untuk jalan lingkungan & perumahan.\n2. **Tronton** (22-24 m³) — hemat biaya untuk urugan proyek volume besar.\n3. **Engkel** (4 m³) — solusi akses jalan sempit.\n\nUntuk proyek Anda di daerah mana dan butuh berapa rit, ${displayName}?`;
  } else if (/halo|hi|pagi|siang|sore|malam|assalamu|tes|test/i.test(lower)) {
    reply = `Halo ${displayName}! Selamat datang di layanan WhatsApp Resmi **IndoPlangsir** 🚜\n\nKami siap melayani kebutuhan material urug tanah merah, buang puing bangunan, pasir cor, dan sirtu dengan armada dump truck terpercaya.\n\nAda yang bisa kami bantu untuk proyek Anda hari ini?`;
  } else {
    reply = `Halo ${displayName}, terima kasih atas pesan Anda di IndoPlangsir! 🚜\n\nPesan Anda: "${text}" telah kami terima.\n\nUntuk pemesanan tanah urug, buang puing, pasir cor, atau sirtu, silakan infokan alamat lokasi proyek dan jumlah rit yang dibutuhkan. Tim kami siap melayani Anda!`;
  }

  return { reply, source: 'rule_based', orderDetected };
}

// Send WhatsApp text message using WhatsApp Business Cloud API
export async function sendWhatsAppMessageDirectly(
  toPhone: string,
  messageText: string,
  credentials?: {
    phoneNumberId?: string;
    accessToken?: string;
    apiVersion?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = credentials?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = credentials?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const apiVersion = credentials?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v21.0';
  const cleanRecipient = sanitizePhoneNumber(toPhone);

  if (!token.trim()) {
    console.error('[WhatsApp Outbound] Gagal mengirim: WHATSAPP_ACCESS_TOKEN belum dikonfigurasi.');
    return { success: false, error: 'WHATSAPP_ACCESS_TOKEN belum dikonfigurasi di server.' };
  }

  if (!phoneId.trim()) {
    console.error('[WhatsApp Outbound] Gagal mengirim: WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi.');
    return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi di server.' };
  }

  if (!cleanRecipient) {
    return { success: false, error: 'Nomor penerima WhatsApp tidak valid.' };
  }

  const endpointUrl = `https://graph.facebook.com/${apiVersion.trim()}/${phoneId.trim()}/messages`;

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanRecipient,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    });

    const data: any = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `Meta API error (${res.status})`;
      console.error('[WhatsApp Outbound] Error sending WhatsApp message:', errMsg, data?.error);
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id || 'wamid_ok';
    console.log(`[WhatsApp Outbound] Sukses mengirim pesan ke ${cleanRecipient} (wamid: ${messageId})`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error('[WhatsApp Outbound] Exception sending WhatsApp message:', err?.message || err);
    return { success: false, error: err?.message || 'Gagal menghubungi WhatsApp Cloud API' };
  }
}

// Master handler: Process incoming Meta WhatsApp message event, generate AI response, and reply directly on WhatsApp
export async function processIncomingWhatsAppMessage(
  payload: any,
  options?: {
    whatsappPhoneNumberId?: string;
    whatsappAccessToken?: string;
    whatsappApiVersion?: string;
    whatsappAdminNumber?: string;
    elevenlabsAgentId?: string;
    elevenlabsApiKey?: string;
  }
): Promise<WhatsAppReplyResult> {
  const entry = payload?.entry?.[0];
  const changes = entry?.changes?.[0]?.value;
  const messages = changes?.messages;
  const contacts = changes?.contacts;

  // If no message in payload (e.g. delivery receipts, read ticks, or ping)
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { processed: false };
  }

  const msg = messages[0];
  const fromPhone = sanitizePhoneNumber(msg.from);
  const senderName = contacts?.[0]?.profile?.name || 'Pelanggan WhatsApp';
  const messageType = msg.type;

  // Only handle text or send friendly fallback for non-text
  let userText = '';
  if (messageType === 'text') {
    userText = msg.text?.body || '';
  } else if (messageType === 'audio' || messageType === 'voice') {
    userText = '[Pesan Suara/Audio diterima]';
  } else if (messageType === 'image') {
    userText = msg.image?.caption || '[Gambar diterima]';
  } else if (messageType === 'location') {
    userText = `[Lokasi dikirim: Lat ${msg.location?.latitude}, Long ${msg.location?.longitude}]`;
  } else {
    userText = `[Pesan ${messageType}]`;
  }

  if (!fromPhone || !userText) {
    return { processed: false };
  }

  console.log(`[WhatsApp Inbound] Pesan baru dari ${senderName} (${fromPhone}): "${userText}"`);

  // 1. Generate AI Response
  const aiResult = await generateIndoPlangsirAIReply(userText, fromPhone, senderName, {
    elevenlabsAgentId: options?.elevenlabsAgentId,
    elevenlabsApiKey: options?.elevenlabsApiKey,
  });

  const replyText = aiResult.reply;

  // 2. Send Reply DIRECTLY to customer on WhatsApp
  const sendResult = await sendWhatsAppMessageDirectly(fromPhone, replyText, {
    phoneNumberId: options?.whatsappPhoneNumberId,
    accessToken: options?.whatsappAccessToken,
    apiVersion: options?.whatsappApiVersion,
  });

  // 3. Save conversation to Supabase chat_logs
  insertChatLogToSupabase({
    from_phone: fromPhone,
    from_name: senderName,
    user_message: userText,
    agent_reply: replyText,
    agent_source: aiResult.source,
    order_detected: aiResult.orderDetected,
  }).catch((dbErr) => console.error('[Supabase Chat Insert Error]', dbErr));

  // 4. If customer is ordering, notify Admin on WhatsApp as well!
  const adminNumber = options?.whatsappAdminNumber || process.env.WHATSAPP_ADMIN_NUMBER;
  if (aiResult.orderDetected && adminNumber) {
    const cleanAdmin = sanitizePhoneNumber(adminNumber);
    if (cleanAdmin && cleanAdmin !== fromPhone) {
      const adminNotice = `🔔 *LEAD ORDER BARU DARI WHATSAPP*\n\n` +
        `Pelanggan: *${senderName}*\n` +
        `WhatsApp: https://wa.me/${fromPhone}\n` +
        `Pesan: "${userText}"\n\n` +
        `AI Agent telah merespons dan meminta detail ritase/lokasi. Silakan pantau atau hubungi pelanggan.`;

      sendWhatsAppMessageDirectly(cleanAdmin, adminNotice, {
        phoneNumberId: options?.whatsappPhoneNumberId,
        accessToken: options?.whatsappAccessToken,
        apiVersion: options?.whatsappApiVersion,
      }).catch((err) => console.error('[Admin WhatsApp Lead Alert Error]', err));
    }
  }

  return {
    processed: true,
    fromPhone,
    senderName,
    userMessage: userText,
    replyText,
    whatsappMessageId: sendResult.messageId,
    orderDetected: aiResult.orderDetected,
    error: sendResult.error,
  };
}
