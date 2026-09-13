const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String, default: '' },
  topic: { type: String, default: '' },
}, { _id: true });

const attemptSchema = new mongoose.Schema({
  answers: [{ type: Number }], // index of chosen option
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken: { type: Number, default: 0 }, // seconds
  completedAt: { type: Date, default: Date.now },
});

const quizSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  subject: { type: String, default: 'General' },
  questions: [questionSchema],
  questionCount: { type: Number, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  attempts: [attemptSchema],
  bestScore: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, { timestamps: true });

quizSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
