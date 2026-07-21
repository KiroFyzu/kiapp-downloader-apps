const config = require('../config');

/**
 * API Key middleware — endpoint downloader diproteksi dengan X-API-Key.
 * Mobile app akan mengirim key ini di header (disimpan di SecureStore/Keychain).
 */
function apiKeyMiddleware(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key || key !== config.apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key tidak valid atau tidak ditemukan',
    });
  }
  next();
}

module.exports = apiKeyMiddleware;
