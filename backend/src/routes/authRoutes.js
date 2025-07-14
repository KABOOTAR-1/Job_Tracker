const express = require('express');
const router = express.Router();
const { 
  authenticateExtension, 
  linkExtensionToAccount 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/extension', authenticateExtension);

router.post('/link-extension', protect, linkExtensionToAccount);

module.exports = router;
