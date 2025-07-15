const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { 
  uploadResume, 
  getResume, 
  analyzeJobDescription 
} = require('../controllers/resumeController');

router.use(protect);

router.route('/')
  .post(upload.single('resumeFile'), uploadResume);

router.route('/me')
  .get(getResume);

router.route('/analyze')
  .post(analyzeJobDescription);

module.exports = router;
