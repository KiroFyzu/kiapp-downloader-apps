const BaseDownloader = require('./BaseDownloader');
const config = require('../config');
const { fetchFromSiputzx } = require('../utils/siputzx');
const ApiError = require('../utils/ApiError');

class InstagramDownloader extends BaseDownloader {
  constructor() {
    super('instagram');
  }

  async fetchMedia(url) {
    // 1) Custom provider dari .env
    const customUrl = config.providers.instagram;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[Instagram] custom provider gagal:', e.message);
      }
    }

    // 2) Siputzx API
    try {
      const d = await fetchFromSiputzx('instagram', url);
      return this.fromSiputzx(d);
    } catch (e) {
      console.warn('[Instagram] Siputzx gagal:', e.message);
    }

    throw new ApiError(502, 'Instagram: semua provider gagal');
  }

  fromSiputzx(d) {
    const media = [];
    if (Array.isArray(d.media)) {
      d.media.forEach((m) => {
        if (m.url) {
          media.push({
            url: m.url,
            type: ['video', 'image'].includes(m.type) ? m.type : 'image',
            quality: m.quality || 'original',
          });
        }
      });
    }
    return {
      platform: 'instagram',
      title: d.title || '',
      thumbnail: d.thumbnail || media.find((m) => m.type === 'image')?.url || '',
      author: d.author || '',
      duration: null,
      media,
    };
  }

  format(raw) {
    return {
      platform: 'instagram',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = InstagramDownloader;
