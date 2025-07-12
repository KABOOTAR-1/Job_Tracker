const express = require('express');
const router = express.Router();
const { 
  authenticateExtension, 
  linkExtensionToAccount 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public route for extension authentication
router.post('/extension', authenticateExtension);

// Protected route to link extension to existing account
router.post('/link-extension', protect, linkExtensionToAccount);

module.exports = router;
