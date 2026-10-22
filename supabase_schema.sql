-- ==============================================================================
-- SCHEMA DATABASE SUPABASE UNTUK INDOPLANGSIR
-- Jalankan skrip SQL ini di Supabase Studio -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. TABEL ORDERS (Menyimpan riwayat pesanan yang diterima dari ElevenLabs / WhatsApp)
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
  status_notifikasi TEXT NOT NULL DEFAULT 'delivered', -- 'delivered', 'failed', 'duplicate'
  whatsapp_message_id TEXT,
  error_message TEXT
);

-- Index untuk mempercepat query pencarian order
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_nomor_whatsapp ON public.orders (nomor_whatsapp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status_notifikasi);

-- 2. TABEL CHAT_LOGS (Menyimpan riwayat percakapan antara pelanggan dan AI Agent WhatsApp)
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_phone TEXT NOT NULL,
  from_name TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_reply TEXT NOT NULL,
  agent_source TEXT NOT NULL DEFAULT 'elevenlabs', -- 'elevenlabs' atau 'indoplangsir_ai'
  order_detected BOOLEAN NOT NULL DEFAULT false
);

-- Index untuk chat_logs
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON public.chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_from_phone ON public.chat_logs (from_phone);

-- 3. TABEL DISPATCH_LOGS (Audit log pengiriman notifikasi ke WhatsApp Admin via Cloud API)
CREATE TABLE IF NOT EXISTS public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL, -- 'webhook' atau 'admin_test'
  customer_name TEXT NOT NULL,
  service TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  status TEXT NOT NULL, -- 'delivered', 'failed', 'duplicate', 'unconfigured'
  status_code INT NOT NULL,
  whatsapp_message_id TEXT,
  recipient TEXT NOT NULL,
  error_message TEXT
);

-- Index untuk dispatch_logs
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_created_at ON public.dispatch_logs (created_at DESC);

-- ==============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS)
-- Secara default, izinkan backend membaca dan menulis data
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Policy untuk Service Role (Full Access untuk backend server & Next.js/Vercel)
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders" ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access chat_logs" ON public.chat_logs;
CREATE POLICY "Service role full access chat_logs" ON public.chat_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access dispatch_logs" ON public.dispatch_logs;
CREATE POLICY "Service role full access dispatch_logs" ON public.dispatch_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy untuk Anon key (Read & Insert diperbolehkan dari aplikasi dashboard)
DROP POLICY IF EXISTS "Anon read and insert orders" ON public.orders;
CREATE POLICY "Anon read and insert orders" ON public.orders
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read and insert chat_logs" ON public.chat_logs;
CREATE POLICY "Anon read and insert chat_logs" ON public.chat_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read and insert dispatch_logs" ON public.dispatch_logs;
CREATE POLICY "Anon read and insert dispatch_logs" ON public.dispatch_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
