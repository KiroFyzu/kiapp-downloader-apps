/**
 * Script untuk membuat tabel api_keys di Supabase.
 * Jalankan: node scripts/migrate-api-keys.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env');
  process.exit(1);
}

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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('Menjalankan migration...');
  const { error } = await supabase.rpc('pg_query', { query: sql }).single();

  if (error) {
    // Fallback: coba via REST API raw
    console.log('RPC gagal, coba metode alternatif...');
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      console.log('Status:', res.status);
      console.log('Response:', text);
    } catch (err2) {
      console.error('Error:', err2.message);
    }
  } else {
    console.log('✅ Migration berhasil!');
  }
}

run().catch(console.error);
