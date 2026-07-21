require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  providers: {
    tiktok: process.env.TIKTOK_API_URL,
    instagram: process.env.INSTAGRAM_API_URL,
    facebook: process.env.FACEBOOK_API_URL,
    twitter: process.env.TWITTER_API_URL,
    youtube: process.env.YOUTUBE_API_URL,
    capcut: process.env.CAPCUT_API_URL,
  },
};
