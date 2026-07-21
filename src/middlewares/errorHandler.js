const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal Server Error',
  };
  if (err.details) payload.details = err.details;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err);
  }
  res.status(status).json(payload);
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
}

module.exports = { errorHandler, notFound };
