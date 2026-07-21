const { detectPlatform, SUPPORTED_PLATFORMS } = require('./detectPlatform');
const ApiError = require('./ApiError');

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ApiError(400, 'URL harus menggunakan protokol http/https');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'URL tidak valid');
  }

  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    throw new ApiError(
      400,
      'URL tidak dikenali sebagai platform yang didukung',
      { supportedPlatforms: SUPPORTED_PLATFORMS }
    );
  }

  return platform;
}

module.exports = { validateUrl };
