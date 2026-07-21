/**
 * Script membuat tabel api_keys di Supabase.
 * Jalankan: node scripts/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL; // https://fpoozlugltjkdfvqjgow.supabase.co
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

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

function callSupabase(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, supabaseUrl);
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': anonKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Membuat tabel api_keys...\n');

  // Coba via pg_query RPC
  const result = await callSupabase('/rest/v1/rpc/pg_query', { query: sql });
  console.log(`Status: ${result.status}`);

  if (result.status === 200 || result.status === 204) {
    console.log('✅ Tabel api_keys berhasil dibuat!');
    return;
  }

  console.log('Response:', result.body);
  console.log('\n❌ Gagal menjalankan via API.');
  console.log('\n👉 Buka https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('   Copy paste isi backend/supabase/schema.sql lalu klik Run.');
}

main().catch(console.error);
