const express = require('express');
const downloadController = require('../controllers/downloadController');
const historyController = require('../controllers/historyController');
const apiKeyMiddleware = require('../middlewares/apiKey');

const router = express.Router();

// Downloader diproteksi API Key
router.get('/download/platforms', apiKeyMiddleware, downloadController.listPlatforms);
router.post('/download', apiKeyMiddleware, downloadController.download);

// History
router.get('/history', apiKeyMiddleware, historyController.list);
router.post('/history', apiKeyMiddleware, historyController.create);
router.delete('/history/:id', apiKeyMiddleware, historyController.remove);
router.delete('/history', apiKeyMiddleware, historyController.clear);

module.exports = router;
