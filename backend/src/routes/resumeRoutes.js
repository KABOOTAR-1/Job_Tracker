const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { 
  uploadResume, 
  getResume, 
  analyzeJobDescription 
} = require('../controllers/resumeController');

// All resume routes require authentication
router.use(protect);

// Route for uploading resume with file upload middleware
router.route('/')
  .post(upload.single('resumeFile'), uploadResume);

router.route('/me')
  .get(getResume);

// Make sure /analyze comes after /:browserIdentifier to avoid routing conflicts
router.route('/analyze')
  .post(analyzeJobDescription);

module.exports = router;
