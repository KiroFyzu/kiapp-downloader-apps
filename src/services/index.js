const TiktokDownloader = require('./tiktokDownloader');
const InstagramDownloader = require('./instagramDownloader');
const FacebookDownloader = require('./facebookDownloader');
const TwitterDownloader = require('./twitterDownloader');
const YoutubeDownloader = require('./youtubeDownloader');
const CapCutDownloader = require('./capcutDownloader');
const BaseDownloader = require('./BaseDownloader');
const ApiError = require('../utils/ApiError');

const map = {
  tiktok: TiktokDownloader,
  instagram: InstagramDownloader,
  facebook: FacebookDownloader,
  twitter: TwitterDownloader,
  youtube: YoutubeDownloader,
  capcut: CapCutDownloader,
};

/**
 * Factory function. Dipakai controllers:
 *   const downloader = getDownloader(platform);
 *   const data = await downloader.fetchMedia(url);
 */
function getDownloader(platform) {
  if (!platform) {
    throw new ApiError(400, 'Platform tidak boleh kosong');
  }
  const Klass = map[platform];
  if (!Klass) {
    // fallback generik: tetap lewat BaseDownloader kalau ada provider
    return new BaseDownloader(platform);
  }
  return new Klass();
}

module.exports = { getDownloader };
