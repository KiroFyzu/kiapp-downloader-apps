const BaseDownloader = require('./BaseDownloader');
const config = require('../config');
const { fetchFromSiputzx } = require('../utils/siputzx');
const ApiError = require('../utils/ApiError');

class FacebookDownloader extends BaseDownloader {
  constructor() {
    super('facebook');
  }

  async fetchMedia(url) {
    // 1) Custom provider dari .env
    const customUrl = config.providers.facebook;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[Facebook] custom provider gagal:', e.message);
      }
    }

    // 2) Siputzx API
    try {
      const d = await fetchFromSiputzx('facebook', url);
      return this.fromSiputzx(d);
    } catch (e) {
      console.warn('[Facebook] Siputzx gagal:', e.message);
    }

    throw new ApiError(502, 'Facebook: semua provider gagal');
  }

  fromSiputzx(d) {
    const media = [];
    if (Array.isArray(d.media)) {
      d.media.forEach((m) => {
        if (m.url) {
          media.push({
            url: m.url,
            type: ['video', 'image'].includes(m.type) ? m.type : 'video',
            quality: m.quality || 'hd',
          });
        }
      });
    }
    return {
      platform: 'facebook',
      title: d.title || '',
      thumbnail: d.thumbnail || '',
      author: d.author || '',
      duration: null,
      media,
    };
  }

  format(raw) {
    return {
      platform: 'facebook',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = FacebookDownloader;
