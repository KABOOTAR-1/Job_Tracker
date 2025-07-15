const express = require('express');
const router = express.Router();
const { 
  login,
  register,
  getCurrentUser
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Standard authentication routes
router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getCurrentUser);

module.exports = router;
