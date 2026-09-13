const express = require('express');
const router = express.Router();
const { wrapController } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../validators/schemas');
const quizService = require('../services/quiz/quizService');

router.use(protect);

// POST /api/quiz/generate
router.post('/generate', validate(schemas.generateQuiz), wrapController(async (req, res) => {
  const quiz = await quizService.generateQuiz(req.user._id, req.body);
  res.status(201).json({ success: true, message: 'Quiz generated successfully', data: { quiz } });
}));

// POST /api/quiz/:id/submit
router.post('/:id/submit', validate(schemas.submitQuiz), wrapController(async (req, res) => {
  const result = await quizService.submitQuiz(req.user._id, req.params.id, req.body);
  res.json({ success: true, message: 'Quiz submitted', data: result });
}));

// GET /api/quiz/history
router.get('/history', wrapController(async (req, res) => {
  const result = await quizService.getQuizHistory(req.user._id, req.query);
  res.json({ success: true, data: result });
}));

// GET /api/quiz/:id
router.get('/:id', wrapController(async (req, res) => {
  const quiz = await quizService.getQuizById(req.user._id, req.params.id);
  res.json({ success: true, data: { quiz } });
}));

module.exports = router;
