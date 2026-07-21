const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const authRoutes = require('./routes/auth');
const docsRouter = require('./docs');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
      },
    },
  })
);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/', (_req, res) => {
  res.json({
    name: 'Social Media Downloader API',
    version: '1.0.0',
    status: 'ok',
    docs: '/docs',
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// API Docs — Scalar
app.use('/docs', docsRouter);

// Auth routes (publik: signup/signin)
app.use('/api/auth', authRoutes);

// Downloader & History routes (dilindungi API key)
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🚀 Server running on port ${config.port} (${config.nodeEnv}) — http://localhost:${config.port}`
  );
});

module.exports = { app, server };
