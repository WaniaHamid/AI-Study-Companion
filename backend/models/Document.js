const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String },
  fileSize: { type: Number },
  extractedText: { type: String, default: '' },
  textLength: { type: Number, default: 0 },
  subject: { type: String, trim: true, default: 'General' },
  tags: [{ type: String, trim: true, lowercase: true }],
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
  },
  processingError: { type: String },
  quizCount: { type: Number, default: 0 },
  aiQueryCount: { type: Number, default: 0 },
}, { timestamps: true });

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model('Document', documentSchema);
