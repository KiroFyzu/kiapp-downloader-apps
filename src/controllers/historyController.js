const { getSupabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');

class HistoryController {
  /**
   * GET /api/history?limit=20
   * - Kalau Authorization header berisi user token, hanya return history user tsb.
   * - Kalau tidak ada token dan ada userId di query, return sesuai userId.
   */
  async list(req, res, next) {
    try {
      const supabase = getSupabase();
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const userId = req.query.userId || null;

      let query = supabase
        .from('downloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw new ApiError(500, error.message);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/history
   * body: { user_id, url, platform, title, thumbnail }
   */
  async create(req, res, next) {
    try {
      const supabase = getSupabase();
      const { user_id, url, platform, title, thumbnail, media } = req.body;

      if (!url || !platform) {
        throw new ApiError(400, 'url dan platform wajib diisi');
      }

      const payload = {
        user_id: user_id || null,
        url,
        platform,
        title: title || '',
        thumbnail: thumbnail || '',
        media: media || [],
      };

      const { data, error } = await supabase
        .from('downloads')
        .insert(payload)
        .select()
        .single();

      if (error) throw new ApiError(500, error.message);

      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/history/:id
   */
  async remove(req, res, next) {
    try {
      const supabase = getSupabase();
      const id = req.params.id;
      const { error } = await supabase.from('downloads').delete().eq('id', id);
      if (error) throw new ApiError(500, error.message);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/history
   * body: { userId } — hapus semua history user tertentu
   */
  async clear(req, res, next) {
    try {
      const supabase = getSupabase();
      const userId = req.body?.userId;
      if (!userId) throw new ApiError(400, 'userId wajib diisi');

      const { error } = await supabase
        .from('downloads')
        .delete()
        .eq('user_id', userId);
      if (error) throw new ApiError(500, error.message);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HistoryController();
