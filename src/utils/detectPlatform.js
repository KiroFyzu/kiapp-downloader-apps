/**
 * Deteksi platform social media dari URL.
 * Mendukung: tiktok, instagram, facebook, twitter/x, youtube, threads, pinterest, reddit, snackvideo.
 */
function detectPlatform(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  const u = url.toLowerCase();

  if (/(tiktok\.com|vm\.tiktok|vt\.tiktok|short\.tiktok)/.test(u)) return 'tiktok';
  if (/(instagram\.com|instagr\.am)/.test(u)) return 'instagram';
  if (/(facebook\.com|fb\.watch|fb\.com)/.test(u)) return 'facebook';
  if (/\b(twitter\.com|x\.com)\b|t\.co\b/.test(u)) return 'twitter';
  if (/(youtube\.com|youtu\.be)/.test(u)) return 'youtube';
  if (/(threads\.net|threads\.com)/.test(u)) return 'threads';
  if (/(pinterest\.com|pin\.it)/.test(u)) return 'pinterest';
  if (/(reddit\.com|redd\.it)/.test(u)) return 'reddit';
  if (/(snackvideo\.com)/.test(u)) return 'snackvideo';
  if (/(capcut\.com)/.test(u)) return 'capcut';

  return 'unknown';
}

const SUPPORTED_PLATFORMS = [
  'tiktok',
  'instagram',
  'facebook',
  'twitter',
  'youtube',
  'threads',
  'pinterest',
  'reddit',
  'snackvideo',
  'capcut',
];

module.exports = { detectPlatform, SUPPORTED_PLATFORMS };
