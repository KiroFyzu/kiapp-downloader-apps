/**
 * Shared Siputzx API client.
 * Semua platform downloader bisa panggil ini sebagai provider kedua
 * (setelah custom provider dari env, sebelum cheerio scraping).
 */
const axios = require('axios');

const BASE = 'https://api.siputzx.my.id/api/d';

/**
 * @param {string} platform — 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'capcut'
 * @param {string} url      — URL konten yang mau di-download
 * @returns {object}         — Raw response body dari Siputzx { status, data }
 */
async function fetchFromSiputzx(platform, url) {
  const apiUrl = `${BASE}/${platform}`;
  const res = await axios.get(apiUrl, {
    params: { url },
    timeout: 25000,
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
  });

  if (!res.data || res.data.status !== true) {
    throw new Error(`Siputzx[${platform}]: response invalid`);
  }

  return res.data.data;
}

module.exports = { fetchFromSiputzx };
