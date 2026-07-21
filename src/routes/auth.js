const express = require('express');
const authController = require('../controllers/authController');
const apiKeyMiddleware = require('../middlewares/apiKey');

const router = express.Router();

// Publik — tidak perlu API key
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

// Butuh API key — untuk lihat profile / refresh key
router.get('/me', apiKeyMiddleware, authController.me);
router.post('/refresh-key', apiKeyMiddleware, authController.refreshKey);

module.exports = router;
