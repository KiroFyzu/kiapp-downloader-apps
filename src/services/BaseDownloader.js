const axios = require('axios');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Base service untuk semua platform.
 * Pattern: setiap platform cukup meng-override method `fetchMedia(url)`.
 *
 * Saat ini default implementasi memanggil external provider (lihat .env)
 * dengan format { url } -> { title, thumbnail, media: [{ url, type, quality }] }.
 * Ganti dengan provider Anda sendiri ketika API sudah siap.
 */
class BaseDownloader {
  constructor(platform) {
    this.platform = platform;
  }

  async callProvider(providerUrl, url) {
    if (!providerUrl) {
      throw new ApiError(
        503,
        `Provider untuk platform "${this.platform}" belum dikonfigurasi. ` +
          `Set ${this.platform.toUpperCase()}_API_URL di .env atau hubungi admin.`
      );
    }

    try {
      const { data } = await axios.post(
        providerUrl,
        { url, platform: this.platform },
        { timeout: 30000 }
      );
      return data;
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Provider error';
      throw new ApiError(502, `Gagal mengambil media: ${msg}`);
    }
  }

  async fetchMedia(url) {
    const providerUrl = config.providers[this.platform];
    const raw = await this.callProvider(providerUrl, url);

    return {
      platform: this.platform,
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = BaseDownloader;
