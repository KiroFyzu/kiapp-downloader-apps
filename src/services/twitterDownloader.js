const BaseDownloader = require('./BaseDownloader');
const config = require('../config');
const { fetchFromSiputzx } = require('../utils/siputzx');
const ApiError = require('../utils/ApiError');

class TwitterDownloader extends BaseDownloader {
  constructor() {
    super('twitter');
  }

  async fetchMedia(url) {
    // 1) Custom provider dari .env
    const customUrl = config.providers.twitter;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[Twitter] custom provider gagal:', e.message);
      }
    }

    // 2) Siputzx API
    try {
      const d = await fetchFromSiputzx('twitter', url);
      return this.fromSiputzx(d);
    } catch (e) {
      console.warn('[Twitter] Siputzx gagal:', e.message);
    }

    throw new ApiError(502, 'Twitter: semua provider gagal');
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
    // Siputzx kadang pakai d.videoUrl langsung
    if (!media.length && d.videoUrl) {
      media.push({ url: d.videoUrl, type: 'video', quality: 'hd' });
    }
    return {
      platform: 'twitter',
      title: d.title || '',
      thumbnail: d.thumbnail || '',
      author: d.author || d.authorName || '',
      duration: null,
      media,
    };
  }

  format(raw) {
    return {
      platform: 'twitter',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = TwitterDownloader;
