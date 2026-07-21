const { downloadSchema } = require('../validators/schemas');
const { getDownloader } = require('../services');
const { validateUrl } = require('../utils/validateUrl');
const ApiError = require('../utils/ApiError');
const { getSupabase } = require('../config/supabase');

class DownloadController {
  /**
   * POST /api/download
   * body: { url: string, saveToHistory?: boolean, userId?: string }
   */
  async download(req, res, next) {
    try {
      const { value, error } = downloadSchema.validate(req.body || {});
      if (error) throw new ApiError(400, error.message);

      const platform = validateUrl(value.url);
      const downloader = getDownloader(platform);
      const result = await downloader.fetchMedia(value.url);

      if (value.saveToHistory !== false) {
        try {
          const supabase = getSupabase();
          await supabase.from('downloads').insert({
            user_id: req.user?.userId || null,
            url: value.url,
            platform,
            title: result.title,
            thumbnail: result.thumbnail,
            media: result.media,
          });
        } catch (dbErr) {
          // history gagal? tetap return data download-nya
          // eslint-disable-next-line no-console
          console.warn('[WARN] gagal menyimpan history:', dbErr.message);
        }
      }

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/download/platforms
   */
  async listPlatforms(_req, res) {
    const { SUPPORTED_PLATFORMS } = require('../utils/detectPlatform');
    res.json({ success: true, data: SUPPORTED_PLATFORMS });
  }
}

module.exports = new DownloadController();
