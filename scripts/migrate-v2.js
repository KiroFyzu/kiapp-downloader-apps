/**
 * Migration: membuat tabel api_keys.
 * Jalankan: node scripts/migrate-v2.js
 *
 * Catatan: Service role key harus valid JWT dari Supabase.
 * Kalau masih gagal, jalankan manual di Supabase SQL Editor.
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key || key === 'your-service-role-key') {
  console.error('❌ SERVICE_ROLE_KEY belum diset di .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = `
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key     TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_api_key_idx ON public.api_keys (api_key);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_select_own" ON public.api_keys;
CREATE POLICY "api_keys_select_own" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "api_keys_insert_own" ON public.api_keys;
CREATE POLICY "api_keys_insert_own" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "api_keys_delete_own" ON public.api_keys;
CREATE POLICY "api_keys_delete_own" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Update trigger untuk juga generate api_key
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.api_keys (user_id, api_key)
  VALUES (new.id, encode(sha256((new.id::text || '-' || gen_random_uuid()::text)::bytea), 'hex'));

  RETURN new;
END;
$function$;
`;

async function main() {
  console.log('⏳ Menjalankan migration...');

  // Coba langsung insert ke tabel — kalau error "not found", tabel belum ada
  const { error: testError } = await supabase.from('api_keys').select('id').limit(1);
  if (testError && testError.message?.includes('not exist') || testError?.code === 'PGRST116') {
    console.log('ℹ️  Tabel api_keys belum ada, perlu dibuat manual.');
  } else if (!testError) {
    console.log('✅ Tabel api_keys sudah ada!');
    return;
  }

  // Coba pakai rpc (kalau ada)
  const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle();
  if (rpcError) {
    console.log('⚠️  RPC exec_sql tidak tersedia.');
  } else {
    console.log('✅ Migration berhasil via RPC!');
    return;
  }

  const ref = url.replace('https://', '').replace('.supabase.co', '');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Tidak bisa membuat tabel via API.

Silakan buka link berikut:
👉 https://supabase.com/dashboard/project/${ref}/sql/new

Lalu copy paste isi file:
   backend/supabase/schema.sql

Atau jalankan query ini di SQL Editor:

CREATE TABLE IF NOT EXISTS public.api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key     TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_api_key_idx ON public.api_keys (api_key);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS \$function\$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.api_keys (user_id, api_key)
  VALUES (new.id, encode(sha256((new.id::text || '-' || gen_random_uuid()::text)::bytea), 'hex'));
  RETURN new;
END;
\$function\$;
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(console.error);
