const { getSupabase } = require('../config/supabase');

/**
 * API Key middleware — endpoint diproteksi dengan X-API-Key.
 * Tiap user punya API key sendiri (tersimpan di tabel api_keys).
 * Middleware ini melakukan lookup ke DB, lalu menyimpan info user di req.user.
 */
async function apiKeyMiddleware(req, res, next) {
  try {
    const key = req.header('X-API-Key');
    if (!key) {
      return res.status(401).json({
        success: false,
        message: 'API Key tidak ditemukan. Kirim header X-API-Key.',
      });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, api_key, created_at, last_used_at')
      .eq('api_key', key)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({
        success: false,
        message: 'API Key tidak valid',
      });
    }

    // Update last_used_at (jangan tunggu selesai)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then()
      .catch(() => {});

    // Simpan info user dari API key
    req.apiKey = key;
    req.user = {
      keyId: data.id,
      userId: data.user_id,
    };

    next();
  } catch (err) {
    // Tangani kasus tabel belum ada di Supabase
    const isTableMissing = err.message?.includes('relation') && err.message?.includes('does not exist');
    const msg = isTableMissing
      ? 'Tabel api_keys belum ada. Jalankan schema.sql di Supabase SQL Editor.'
      : err.message || 'Internal server error';
    console.error('[apiKey] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: msg,
    });
  }
}

module.exports = apiKeyMiddleware;
