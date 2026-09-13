const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { wrapController } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../validators/schemas');
const aiService = require('../services/ai/aiService');

// Stricter rate limit for AI endpoints (prevent abuse)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  message: { success: false, message: 'AI rate limit reached. Please wait before asking more questions.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

router.use(protect);
router.use(aiLimiter);

// POST /api/ai/ask
router.post('/ask', validate(schemas.askQuestion), wrapController(async (req, res) => {
  const result = await aiService.askQuestion(req.user._id, req.body);
  res.json({ success: true, data: result });
}));

// POST /api/ai/summarize
router.post('/summarize', wrapController(async (req, res) => {
  const { documentId } = req.body;
  if (!documentId) return res.status(400).json({ success: false, message: 'documentId is required' });
  const result = await aiService.summarizeDocument(req.user._id, documentId);
  res.json({ success: true, data: result });
}));

// GET /api/ai/history
router.get('/history', wrapController(async (req, res) => {
  const { documentId, limit } = req.query;
  const history = await aiService.getChatHistory(req.user._id, documentId, parseInt(limit) || 20);
  res.json({ success: true, data: { history } });
}));

module.exports = router;
