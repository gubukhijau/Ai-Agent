import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cached dynamic runtime config (in addition to process.env)
let runtimeSupabaseUrl = process.env.SUPABASE_URL || '';
let runtimeSupabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

let supabaseServerClient: SupabaseClient | null = null;

export function updateRuntimeSupabaseConfig(url?: string, key?: string) {
  if (typeof url === 'string') runtimeSupabaseUrl = url.trim();
  if (typeof key === 'string' && key.trim() !== '') runtimeSupabaseKey = key.trim();
  supabaseServerClient = null; // force re-creation
}

export function getSupabaseConfig() {
  const url = runtimeSupabaseUrl || process.env.SUPABASE_URL || '';
  const key =
    runtimeSupabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  return {
    isConfigured: Boolean(url && key),
    url,
    hasKey: Boolean(key),
  };
}

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || runtimeSupabaseUrl || process.env.SUPABASE_URL || '';
  const key =
    customKey ||
    runtimeSupabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!url || !key) {
    return null;
  }

  // If custom credentials are provided (e.g. testing connection)
  if (customUrl || customKey) {
    try {
      return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch {
      return null;
    }
  }

  if (!supabaseServerClient) {
    try {
      supabaseServerClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (err) {
      console.error('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return supabaseServerClient;
}

export function resetSupabaseClient() {
  supabaseServerClient = null;
}

// ----------------------------------------------------------------------
// Database Operations: Orders, Chats, Dispatch Logs
// ----------------------------------------------------------------------

export interface SupabaseOrderRow {
  id?: string;
  created_at?: string;
  nama_pelanggan: string;
  nomor_whatsapp: string;
  alamat_lokasi: string;
  jenis_layanan: string;
  jenis_kendaraan: string;
  jumlah_rit: string;
  jadwal: string;
  catatan?: string;
  status_notifikasi?: string;
  whatsapp_message_id?: string;
  error_message?: string;
}

export interface SupabaseChatRow {
  id?: string;
  created_at?: string;
  from_phone: string;
  from_name: string;
  user_message: string;
  agent_reply: string;
  agent_source: string;
  order_detected?: boolean;
}

export async function insertOrderToSupabase(order: SupabaseOrderRow): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi (SUPABASE_URL / SUPABASE_KEY).' };
  }

  try {
    const { error } = await client.from('orders').insert([
      {
        nama_pelanggan: order.nama_pelanggan,
        nomor_whatsapp: order.nomor_whatsapp,
        alamat_lokasi: order.alamat_lokasi,
        jenis_layanan: order.jenis_layanan,
        jenis_kendaraan: order.jenis_kendaraan,
        jumlah_rit: String(order.jumlah_rit),
        jadwal: order.jadwal,
        catatan: order.catatan || '',
        status_notifikasi: order.status_notifikasi || 'pending',
        whatsapp_message_id: order.whatsapp_message_id || null,
        error_message: order.error_message || null,
      },
    ]);

    if (error) {
      console.error('[Supabase] Error inserting order:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Exception inserting order:', err?.message);
    return { success: false, error: err?.message || 'Database insert exception' };
  }
}

export async function insertChatLogToSupabase(chat: SupabaseChatRow): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { error } = await client.from('chat_logs').insert([
      {
        from_phone: chat.from_phone,
        from_name: chat.from_name,
        user_message: chat.user_message,
        agent_reply: chat.agent_reply,
        agent_source: chat.agent_source,
        order_detected: Boolean(chat.order_detected),
      },
    ]);

    if (error) {
      console.error('[Supabase] Error inserting chat log:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Exception inserting chat log:', err?.message);
    return { success: false, error: err?.message || 'Database insert exception' };
  }
}

export async function insertDispatchLogToSupabase(log: {
  source: string;
  customer_name: string;
  service: string;
  vehicle: string;
  status: string;
  status_code: number;
  whatsapp_message_id?: string;
  recipient: string;
  error_message?: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { error } = await client.from('dispatch_logs').insert([
      {
        source: log.source,
        customer_name: log.customer_name,
        service: log.service,
        vehicle: log.vehicle,
        status: log.status,
        status_code: log.status_code,
        whatsapp_message_id: log.whatsapp_message_id || null,
        recipient: log.recipient,
        error_message: log.error_message || null,
      },
    ]);

    if (error) {
      console.error('[Supabase] Error inserting dispatch log:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Exception inserting dispatch log:', err?.message);
    return { success: false, error: err?.message };
  }
}

export async function fetchSupabaseOrders(limit = 50): Promise<SupabaseOrderRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Failed to fetch orders:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchSupabaseChats(limit = 50): Promise<SupabaseChatRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('chat_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Failed to fetch chat logs:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  success: boolean;
  message: string;
  details?: { ordersCount?: number; chatsCount?: number };
}> {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) {
    return {
      success: false,
      message: 'Kredensial URL atau API Key Supabase tidak boleh kosong.',
    };
  }

  try {
    // Attempt to query count from 'orders' table
    const { count: ordersCount, error: ordersError } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (ordersError) {
      // If table doesn't exist yet, return helpful schema hint
      if (ordersError.message.includes('relation "orders" does not exist') || ordersError.code === '42P01') {
        return {
          success: true,
          message: 'Terhubung ke Supabase! Namun tabel "orders" belum dibuat. Jalankan schema SQL di Supabase SQL Editor.',
          details: { ordersCount: 0, chatsCount: 0 },
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase gagal: ${ordersError.message} (Kode: ${ordersError.code || 'unknown'})`,
      };
    }

    const { count: chatsCount } = await client
      .from('chat_logs')
      .select('*', { count: 'exact', head: true });

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Database siap digunakan.',
      details: {
        ordersCount: ordersCount ?? 0,
        chatsCount: chatsCount ?? 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menguji koneksi Supabase: ${err?.message || 'Network error'}`,
    };
  }
}
