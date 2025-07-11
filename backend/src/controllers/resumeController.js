const Resume = require('../models/resumeModel');
const { analyzeLLM } = require('../services/llmService');
const pdfParse = require('pdf-parse');

// @desc    Upload or update a resume
// @route   POST /api/resume
// @access  Public
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    const { browserIdentifier } = req.body;
    
    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }

    // Extract text content from PDF
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const content = pdfData.text;
    
    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from the PDF file'
      });
    }
    
    // Update if exists, otherwise create new
    const resume = await Resume.findOneAndUpdate(
      { browserIdentifier },
      { 
        content, 
        browserIdentifier, 
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        originalFile: req.file.buffer
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        id: resume._id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        updatedAt: resume.updatedAt,
        contentPreview: content.substring(0, 200) + '...' // Preview of the content
      },
      message: 'Resume uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing PDF file'
    });
  }
};

// @desc    Get resume by browser identifier
// @route   GET /api/resume/:browserIdentifier
// @access  Public
const getResume = async (req, res) => {
  try {
    const { browserIdentifier } = req.params;

    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }

    const resume = await Resume.findOne({ browserIdentifier });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Return data with a preview of the content instead of the full content
    res.status(200).json({
      success: true,
      data: {
        id: resume._id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        updatedAt: resume.updatedAt,
        contentPreview: resume.content.substring(0, 300) + (resume.content.length > 300 ? '...' : '')
      }
    });
  } catch (error) {
    console.error('Error retrieving resume:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve resume'
    });
  }
};

// @desc    Analyze job description against stored resume
// @route   POST /api/resume/analyze
// @access  Public
const analyzeJobDescription = async (req, res) => {
  try {
    const { jobDescription, browserIdentifier } = req.body;

    if (!jobDescription || !browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Job description and browser identifier are required'
      });
    }

    // Find user's resume
    const resume = await Resume.findOne({ browserIdentifier });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found. Please upload a resume first.'
      });
    }

    // Use LLM service to analyze job description against resume
    const analysis = await analyzeLLM(resume.content, jobDescription);

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  uploadResume,
  getResume,
  analyzeJobDescription
};
