const axios = require('axios');
const cheerio = require('cheerio');
const BaseDownloader = require('./BaseDownloader');
const config = require('../config');

/**
 * CapCut downloader.
 *
 * Provider: https://api.siputzx.my.id/api/d/capcut?url=...
 * Response shape:
 * {
 *   status: true,
 *   data: {
 *     code: 200,
 *     title: string,
 *     originalVideoUrl: string,  // signed CDN URL (bisa download langsung)
 *     coverUrl: string,
 *     authorName: string
 *   }
 * }
 *
 * URL yang didukung:
 *   https://www.capcut.com/tv2/<id>/<slug>
 *   https://www.capcut.com/<id>
 */
class CapCutDownloader extends BaseDownloader {
  constructor() {
    super('capcut');
  }

  /**
   * Try Siputzx API first, fallback to scraping capcut.com
   */
  async fetchMedia(url) {
    // 0) Custom provider dari .env
    const customUrl = config.providers.capcut;
    if (customUrl) {
      try {
        const raw = await this.callProvider(customUrl, url);
        return this.format(raw);
      } catch (e) {
        console.warn('[CapCut] custom provider gagal:', e.message);
      }
    }

    // 1) Siputzx API
    try {
      return await this.fetchViaSiputzx(url);
    } catch (err) {
      console.warn('[CapCut] Siputzx gagal:', err.message, '→ fallback scraping');
    }

    // 2) Fallback: scrape HTML
    return this.fetchViaScraping(url);
  }

  async fetchViaSiputzx(url) {
    const apiUrl = 'https://api.siputzx.my.id/api/d/capcut';
    const res = await axios.get(apiUrl, {
      params: { url },
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });

    if (!res.data || res.data.status !== true || !res.data.data) {
      throw new Error('Siputzx: response invalid');
    }

    const d = res.data.data;
    if (d.code && d.code !== 200) {
      throw new Error('Siputzx: data code != 200');
    }

    return {
      platform: 'capcut',
      title: (d.title || '').trim(),
      thumbnail: d.coverUrl || '',
      author: d.authorName || '',
      duration: null,
      media: [
        {
          url: d.originalVideoUrl,
          type: 'video',
          quality: 'hd',
        },
      ],
      provider: 'siputzx',
    };
  }

  async fetchViaScraping(url) {
    const res = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(res.data);

    // Cari videoUrl di <script> JSON
    let videoUrl = null;
    let thumbnail = $('meta[property="og:image"]').attr('content') || '';
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      '';

    $('script').each((_, el) => {
      const text = $(el).html() || '';
      // Cari pola URL video CapCut
      const m =
        text.match(/"originalVideoUrl"\s*:\s*"([^"]+)"/) ||
        text.match(/"videoUrl"\s*:\s*"([^"]+)"/) ||
        text.match(/"playUrl"\s*:\s*"([^"]+)"/);
      if (m && !videoUrl) videoUrl = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');

      const coverM = text.match(/"coverUrl"\s*:\s*"([^"]+)"/);
      if (coverM && !thumbnail) thumbnail = coverM[1];
    });

    if (!videoUrl) {
      throw new Error('Video URL tidak ditemukan di halaman CapCut');
    }

    return {
      platform: 'capcut',
      title: title.trim(),
      thumbnail,
      author: '',
      duration: null,
      media: [
        {
          url: videoUrl,
          type: 'video',
          quality: 'hd',
        },
      ],
      provider: 'scraping',
    };
  }

  /** Format response dari custom provider (.env) */
  format(raw) {
    return {
      platform: 'capcut',
      title: raw.title || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || '',
      duration: raw.duration || null,
      media: Array.isArray(raw.media) ? raw.media : [],
    };
  }
}

module.exports = new CapCutDownloader();
