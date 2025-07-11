const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
  uploadResume, 
  getResume, 
  analyzeJobDescription 
} = require('../controllers/resumeController');

// Route for uploading resume with file upload middleware
router.route('/')
  .post(upload.single('resumeFile'), uploadResume);

router.route('/:browserIdentifier')
  .get(getResume);

// Make sure /analyze comes after /:browserIdentifier to avoid routing conflicts
router.route('/analyze')
  .post(analyzeJobDescription);

module.exports = router;
