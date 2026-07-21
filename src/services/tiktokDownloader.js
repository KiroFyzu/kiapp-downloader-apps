const axios = require('axios');
const cheerio = require('cheerio');
const BaseDownloader = require('./BaseDownloader');
const config = require('../config');
const ApiError = require('../utils/ApiError');

// =================================================================
// PROVIDER 1 — TTSave (scraping)
// =================================================================
async function downloadFromTTSave(url) {
  try {
    const { data } = await axios.post(
      'https://ttsave.app/download',
      { query: url, language_id: '2' },
      {
        headers: { 'content-type': 'application/json' },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(data);

    const video = $('a[type="no-watermark"]').attr('href') || null;
    const audio = $('a[type="audio"]').attr('href') || null;

    const slides = [];
    $('a[type="slide"]').each((_, el) => {
      const img = $(el).prev('div').find('img').attr('src');
      if (img) slides.push(img);
    });

    if (!video && slides.length === 0 && !audio) {
      return { success: false, error: 'no_content' };
    }

    return {
      success: true,
      type: slides.length ? 'slide' : 'video',
      video,
      audio,
      slides,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =================================================================
// PROVIDER 2 — Siputzx V2 (API)
// =================================================================
async function downloadFromSiputzxV2(url) {
  try {
    const response = await axios.get('https://api.siputzx.my.id/api/d/tiktok/v2', {
      params: { url },
      timeout: 10000,
    });

    const result = response.data;

    if (!result.status || !result.data) {
      throw new Error('Invalid response');
    }

    const data = result.data;
    const videoUrl = data.no_watermark_link_hd || data.no_watermark_link || null;

    if (!videoUrl) {
      throw new Error('No video URL');
    }

    return {
      success: true,
      type: 'video',
      videoUrl,
      backupUrl: data.no_watermark_link || null,
      author: data.author_nickname || 'Unknown',
      title: data.text || 'No title',
      musicLink: data.music_link || null,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =================================================================
// PROVIDER 3 — Siputzx V1 (API, supports slide)
// =================================================================
async function downloadFromSiputzxV1(url) {
  try {
    const response = await axios.get('https://api.siputzx.my.id/api/d/tiktok', {
      params: { url },
      timeout: 10000,
    });

    const result = response.data;

    if (!result.status || !result.data) {
      throw new Error('Invalid response');
    }

    const data = result.data;

    // ----- SLIDE / PHOTO MODE -----
    if (data.type === 'slide' && Array.isArray(data.media)) {
      const slides = data.media
        .filter((m) => m.type === 'image' && m.url)
        .sort((a, b) => (a.index || 0) - (b.index || 0))
        .map((m) => m.url);

      if (!slides.length) {
        throw new Error('No slide images');
      }

      return {
        success: true,
        type: 'slide',
        slides,
        author: data.author || 'Unknown',
        title: data.title || 'No title',
        thumbnail: data.thumbnail || null,
      };
    }

    // ----- VIDEO MODE -----
    if (!Array.isArray(data.media)) {
      throw new Error('No media');
    }

    const mediaList = data.media;
    let videoUrl = null;
    let backupUrl = null;

    const hd = mediaList.find((m) => m.quality === 'HD' && m.type === 'video_hd');
    const sd = mediaList.find((m) => m.quality === 'SD' && m.type === 'video');
    const any = mediaList.find((m) => m.type === 'video' || m.type === 'video_hd');

    if (hd) {
      videoUrl = hd.url;
      backupUrl = hd.backup || null;
    } else if (sd) {
      videoUrl = sd.url;
      backupUrl = sd.backup || null;
    } else if (any) {
      videoUrl = any.url;
      backupUrl = any.backup || null;
    }

    if (!videoUrl) {
      throw new Error('No video URL');
    }

    return {
      success: true,
      type: 'video',
      videoUrl,
      backupUrl,
      author: data.author || 'Unknown',
      title: data.title || 'No title',
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =================================================================
// TiktokDownloader — Multi-provider fallback
// =================================================================
class TiktokDownloader extends BaseDownloader {
  constructor() {
    super('tiktok');
  }

  /**
   * Mencoba provider secara berurutan sampai salah satu berhasil.
   * Urutan: Custom env → TTSave → Siputzx V2 → Siputzx V1
   */
  async fetchMedia(url) {
    // --- Provider 0: Custom provider dari .env ---
    const customUrl = config.providers.tiktok;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[TikTok] custom provider gagal:', e.message);
      }
    }

    // --- Provider 1: TTSave ---
    const ttsave = await downloadFromTTSave(url);
    if (ttsave.success) {
      if (ttsave.type === 'slide' && ttsave.slides?.length) {
        return {
          platform: 'tiktok',
          title: '',
          thumbnail: ttsave.slides[0] || '',
          author: '',
          duration: null,
          media: ttsave.slides.map((slideUrl, i) => ({
            url: slideUrl,
            type: 'image',
            quality: 'original',
          })),
        };
      }

      if (ttsave.video) {
        const media = [{ url: ttsave.video, type: 'video', quality: 'hd' }];

        // Tambah audio kalau ada
        if (ttsave.audio) {
          media.push({ url: ttsave.audio, type: 'audio', quality: 'default' });
        }

        return {
          platform: 'tiktok',
          title: '',
          thumbnail: '',
          author: '',
          duration: null,
          media,
        };
      }
    }

    // --- Provider 2: Siputzx V2 ---
    const v2 = await downloadFromSiputzxV2(url);
    if (v2.success && v2.videoUrl) {
      const media = [{ url: v2.videoUrl, type: 'video', quality: 'hd' }];
      if (v2.musicLink) {
        media.push({ url: v2.musicLink, type: 'audio', quality: 'default' });
      }

      return {
        platform: 'tiktok',
        title: v2.title || '',
        thumbnail: '',
        author: v2.author || '',
        duration: null,
        media,
      };
    }

    // --- Provider 3: Siputzx V1 ---
    const v1 = await downloadFromSiputzxV1(url);
    if (v1.success) {
      if (v1.type === 'slide' && v1.slides?.length) {
        return {
          platform: 'tiktok',
          title: v1.title || '',
          thumbnail: v1.thumbnail || v1.slides[0] || '',
          author: v1.author || '',
          duration: null,
          media: v1.slides.map((slideUrl) => ({
            url: slideUrl,
            type: 'image',
            quality: 'original',
          })),
        };
      }

      if (v1.type === 'video' && v1.videoUrl) {
        return {
          platform: 'tiktok',
          title: v1.title || '',
          thumbnail: '',
          author: v1.author || '',
          duration: null,
          media: [
            { url: v1.videoUrl, type: 'video', quality: 'hd' },
            ...(v1.backupUrl
              ? [{ url: v1.backupUrl, type: 'video', quality: 'sd' }]
              : []),
          ],
        };
      }
    }

    // Semua provider gagal
    throw new ApiError(502, `TikTok: semua provider gagal. ${ttsave.error || v2.error || v1.error || 'unknown error'}`);
  }

  /** Format response dari custom provider (.env) */
  format(raw) {
    return {
      platform: 'tiktok',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = TiktokDownloader;
