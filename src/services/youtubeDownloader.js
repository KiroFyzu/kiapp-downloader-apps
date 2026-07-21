const axios = require('axios');
const BaseDownloader = require('./BaseDownloader');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const SIPUTZX_BASE = 'https://api.siputzx.my.id/api/d';

class YoutubeDownloader extends BaseDownloader {
  constructor() {
    super('youtube');
  }

  async fetchMedia(url) {
    // 1) Custom provider dari .env
    const customUrl = config.providers.youtube;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[YouTube] custom provider gagal:', e.message);
      }
    }

    // 2) Siputzx API — video + audio
    try {
      return await this.fetchFromSiputzx(url);
    } catch (e) {
      console.warn('[YouTube] Siputzx gagal:', e.message);
    }

    throw new ApiError(502, 'YouTube: semua provider gagal');
  }

  async fetchFromSiputzx(url) {
    // Video
    const videoRes = await axios.get(`${SIPUTZX_BASE}/ytmp4`, {
      params: { url },
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!videoRes.data?.status || !videoRes.data?.data) {
      throw new Error('Siputzx ytmp4: response invalid');
    }

    const v = videoRes.data.data;
    const videoUrl = v.videoUrl || v.downloadUrl || v.url || '';

    // Audio (mp3)
    let audioUrl = '';
    try {
      const audioRes = await axios.get(`${SIPUTZX_BASE}/ytmp3`, {
        params: { url },
        timeout: 15000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (audioRes.data?.status && audioRes.data?.data) {
        audioUrl = audioRes.data.data.downloadUrl || audioRes.data.data.url || '';
      }
    } catch (_) {
      // audio opsional
    }

    const media = [{ url: videoUrl, type: 'video', quality: 'hd' }];
    if (audioUrl) {
      media.push({ url: audioUrl, type: 'audio', quality: 'default' });
    }

    return {
      platform: 'youtube',
      title: v.title || '',
      thumbnail: v.thumbnail || '',
      author: v.author || '',
      duration: v.duration || null,
      media,
    };
  }

  format(raw) {
    return {
      platform: 'youtube',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = YoutubeDownloader;
