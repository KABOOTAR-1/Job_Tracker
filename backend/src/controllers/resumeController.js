const Resume = require('../models/resumeModel');
const { analyzeLLM } = require('../services/llmService');
const pdfParse = require('pdf-parse');


const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }
    
    const userId = req.user._id;

    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const content = pdfData.text;
    
    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from the PDF file'
      });
    }
    
    const resume = await Resume.findOneAndUpdate(
      { user: userId },
      { 
        content, 
        user: userId,
        browserIdentifier: req.body.browserIdentifier || req.user.browserIdentifier, 
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

const getResume = async (req, res) => {
  try {
    const userId = req.user._id;

    const resume = await Resume.findOne({ user: userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

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

const analyzeJobDescription = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required'
      });
    }

    const userId = req.user._id;
    const resume = await Resume.findOne({ user: userId });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found. Please upload a resume first.'
      });
    }

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
