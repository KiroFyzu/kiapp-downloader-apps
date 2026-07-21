const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase URL / SERVICE_ROLE_KEY belum diset. Cek file .env Anda.'
    );
  }

  supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

module.exports = { getSupabase };
