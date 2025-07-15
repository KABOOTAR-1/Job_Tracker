const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    applicationDate: {
      type: Date,
      default: Date.now
    },
    url: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['applied', 'interview', 'offer', 'rejected', 'no_response'],
      default: 'applied'
    },
    notes: {
      type: String,
      trim: true
    },
    browserIdentifier: {
      type: String,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
      // Not required to support existing records
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster querying
companySchema.index({ applicationDate: -1 });
companySchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Company', companySchema);
