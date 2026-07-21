const express = require('express');
const { apiReference } = require('@scalar/express-api-reference');
const path = require('path');
const openApiSpec = require('./openapi.json');

const router = express.Router();

// Sajikan OpenAPI spec sebagai JSON mentah (biar bisa di-fetch oleh Scalar CDN juga)
router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Scalar API Reference — UI docs yang cantik
router.use(
  '/',
  apiReference({
    spec: {
      content: openApiSpec,
    },
    // Tema Scalar
    theme: 'default',
    layout: 'modern',
    darkMode: true,
    showSidebar: true,
    hideDownloadButton: false,
    metaData: {
      title: 'Social Media Downloader API',
      description: 'API Documentation',
    },
  })
);

module.exports = router;
