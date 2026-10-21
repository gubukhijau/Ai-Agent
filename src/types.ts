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
  deduplicationWindowMinutes: number;
  activeDeduplicationCount: number;
  rateLimitTestsPerMinute: number;
}

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
