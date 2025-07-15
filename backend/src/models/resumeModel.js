const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Resume content is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    browserIdentifier: {
      type: String,
      trim: true,
      index: true
    },
    fileName: {
      type: String,
      trim: true,
      required: [true, 'File name is required']
    },
    fileType: {
      type: String,
      trim: true,
      default: 'application/pdf'
    },
    fileSize: {
      type: Number
    },
    originalFile: {
      type: Buffer,
      required: [true, 'Resume file is required']
    }
  },
  {
    timestamps: true
  }
);

// Create a unique index on browserIdentifier to ensure one resume per browser
resumeSchema.index({ browserIdentifier: 1 }, { unique: true });

module.exports = mongoose.model('Resume', resumeSchema);
