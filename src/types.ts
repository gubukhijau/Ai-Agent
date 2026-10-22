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

export interface AdminConfig {
  isConfigured: boolean;
  whatsappPhoneNumberIdSet: boolean;
  whatsappPhoneNumberIdMasked: string;
  whatsappAccessTokenSet: boolean;
  whatsappAccessTokenMasked: string;
  whatsappAdminNumberSet: boolean;
  whatsappAdminNumberMasked: string;
  whatsappAdminNumberRaw: string;
  whatsappPhoneNumberIdRaw: string;
  whatsappApiVersion: string;
  whatsappTemplateName: string;
  elevenlabsWebhookSecret: string;
  webhookUrl: string;
  whatsappWebhookVerifyToken: string;
  whatsappInboundWebhookUrl: string;
  elevenlabsAgentId: string;
  elevenlabsApiKeySet: boolean;
  elevenlabsApiKeyMasked: string;
  deduplicationWindowMinutes: number;
  activeDeduplicationCount: number;
  rateLimitTestsPerMinute: number;
}

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  source: 'webhook' | 'admin_test' | 'ai_chat';
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

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

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
