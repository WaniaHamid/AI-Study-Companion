const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null,
  },
  type: {
    type: String,
    enum: ['qa', 'summarize'],
    default: 'qa',
  },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  tokensUsed: { type: Number, default: 0 },
  fromCache: { type: Boolean, default: false },
  responseTimeMs: { type: Number, default: 0 },
}, {
  timestamps: true,
  // TTL index: auto-delete logs after 90 days
  expireAfterSeconds: 90 * 24 * 60 * 60,
});

aiLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AILog', aiLogSchema);
