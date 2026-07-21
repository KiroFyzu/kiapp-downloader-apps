const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const config = require('../config');
const { getSupabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');

/**
 * Buat Supabase admin client (service_role) untuk manage user.
 */
function getAdminClient() {
  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL / SERVICE_ROLE_KEY belum diset');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Generate API key random yang kuat.
 */
function generateApiKey() {
  return 'sdm_' + crypto.randomBytes(32).toString('hex');
}

class AuthController {
  /**
   * POST /api/auth/signup
   * Body: { email, password, fullName? }
   * Return: { user, apiKey }
   */
  async signup(req, res, next) {
    try {
      const { email, password, fullName } = req.body;

      if (!email || !password) {
        throw new ApiError(400, 'Email dan password wajib diisi');
      }
      if (password.length < 6) {
        throw new ApiError(400, 'Password minimal 6 karakter');
      }

      const adminClient = getAdminClient();

      // 1. Buat user di Supabase Auth
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || '' },
      });

      if (authError) {
        // Map error Supabase ke pesan yang lebih friendly
        if (authError.message.includes('already registered')) {
          throw new ApiError(409, 'Email sudah terdaftar');
        }
        throw new ApiError(400, authError.message);
      }

      const userId = authData.user.id;

      // 2. Generate & simpan API key
      const apiKey = generateApiKey();
      const supabase = getSupabase();

      const { error: keyError } = await supabase.from('api_keys').insert({
        user_id: userId,
        api_key: apiKey,
      });

      if (keyError) {
        // Rollback: hapus user kalau gagal simpan key
        await adminClient.auth.admin.deleteUser(userId).catch(() => {});
        throw new ApiError(500, 'Gagal membuat API key: ' + keyError.message);
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            email: authData.user.email,
            fullName: fullName || '',
          },
          apiKey,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/signin
   * Body: { email, password }
   * Return: { user, apiKey }
   */
  async signin(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, 'Email dan password wajib diisi');
      }

      // Login via Supabase Auth (REST API)
      const supabaseUrl = config.supabase.url;
      const anonKey = config.supabase.anonKey;

      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      const tokenData = await response.json();

      if (!response.ok || tokenData.error) {
        const msg = tokenData.error_description || tokenData.error || 'Email atau password salah';
        throw new ApiError(401, msg);
      }

      const userId = tokenData.user.id;

      // Ambil API key user
      const supabase = getSupabase();
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (keyError || !keyData) {
        throw new ApiError(500, 'Gagal mengambil API key');
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .catch(() => {});

      res.json({
        success: true,
        data: {
          user: {
            id: userId,
            email: tokenData.user.email,
          },
          apiKey: keyData.api_key,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Header: X-API-Key
   * Return: { user, apiKey }
   */
  async me(req, res, next) {
    try {
      const supabase = getSupabase();
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*, users:user_id(email)')
        .eq('api_key', req.apiKey)
        .maybeSingle();

      if (keyError || !keyData) {
        throw new ApiError(404, 'Data user tidak ditemukan');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: keyData.user_id,
            email: keyData.users?.email || '',
          },
          apiKey: keyData.api_key,
          createdAt: keyData.created_at,
          lastUsedAt: keyData.last_used_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh-key
   * Header: X-API-Key
   * Body: { } — generate ulang API key
   */
  async refreshKey(req, res, next) {
    try {
      const supabase = getSupabase();
      const newApiKey = generateApiKey();

      const { error } = await supabase
        .from('api_keys')
        .update({ api_key: newApiKey, last_used_at: new Date().toISOString() })
        .eq('api_key', req.apiKey);

      if (error) {
        throw new ApiError(500, 'Gagal memperbarui API key');
      }

      res.json({
        success: true,
        data: { apiKey: newApiKey },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
