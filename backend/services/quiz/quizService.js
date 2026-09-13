const Groq = require('groq-sdk');
const Quiz = require('../../models/Quiz');
const Document = require('../../models/Document');
const User = require('../../models/User');
const { createError } = require('../../middleware/errorHandler');
const { cacheGet, cacheSet, cacheDel } = require('../../config/redis');
const { publishEvent } = require('../../kafka/producer');

const openai = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateQuiz = async (userId, { documentId, questionCount = 5, difficulty = 'medium' }) => {
  const doc = await Document.findById(documentId);
  if (!doc) throw createError('Document not found', 404);
  if (doc.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
  if (doc.status !== 'ready') throw createError('Document is still processing', 400);

  const count = Math.min(Math.max(parseInt(questionCount), 3), 15);
  const context = doc.extractedText.substring(0, 8000);

  const prompt = `Generate ${count} multiple choice questions from the document below.
Difficulty: ${difficulty}
Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Only one correct answer
- Include a brief explanation for the correct answer
- Focus on key concepts

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "topic": "Topic name"
    }
  ]
}

Document: "${doc.title}"
Content: ${context}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message.content);
  } catch {
    throw createError('Failed to parse AI quiz response', 500);
  }

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw createError('Invalid quiz format from AI', 500);
  }

  const quiz = await Quiz.create({
    documentId,
    userId,
    title: `${doc.title} — ${difficulty} Quiz`,
    subject: doc.subject,
    questions: parsed.questions,
    questionCount: parsed.questions.length,
    difficulty,
  });

  // Update stats
  await Promise.all([
    Document.findByIdAndUpdate(documentId, { $inc: { quizCount: 1 } }),
    User.findByIdAndUpdate(userId, { $inc: { 'progress.totalQuizzesTaken': 1 } }),
  ]);

  await publishEvent('quiz_generated', {
    quizId: quiz._id.toString(),
    userId: userId.toString(),
    documentId: documentId.toString(),
    questionCount: quiz.questionCount,
    timestamp: new Date().toISOString(),
  });

  // Cache quiz temporarily (1 hour)
  await cacheSet(`quiz:${quiz._id}`, quiz.toObject(), 3600);

  return quiz;
};

const submitQuiz = async (userId, quizId, { answers, timeTaken = 0 }) => {
  let quiz = await cacheGet(`quiz:${quizId}`);
  if (!quiz) {
    quiz = await Quiz.findById(quizId);
    if (!quiz) throw createError('Quiz not found', 404);
  }

  if (quiz.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
  if (!answers || answers.length !== quiz.questions.length) {
    throw createError('Answer count must match question count', 400);
  }

  let correct = 0;
  const results = quiz.questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctAnswer;
    if (isCorrect) correct++;
    return {
      question: q.question,
      yourAnswer: answers[i],
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const percentage = Math.round((correct / quiz.questions.length) * 100);

  const updatedQuiz = await Quiz.findByIdAndUpdate(
    quizId,
    {
      $push: { attempts: { answers, score: correct, percentage, timeTaken } },
      $max: { bestScore: percentage },
      $inc: { totalAttempts: 1 },
    },
    { new: true }
  );

  // Invalidate quiz cache AND analytics cache so new score shows immediately
  await cacheDel(`quiz:${quizId}`);
  await cacheDel(`analytics:${userId}`);

  await publishEvent('quiz_submitted', {
    quizId,
    userId: userId.toString(),
    score: correct,
    percentage,
    timestamp: new Date().toISOString(),
  });

  return { score: correct, total: quiz.questions.length, percentage, results, timeTaken };
};

const getQuizHistory = async (userId, { page = 1, limit = 10, documentId } = {}) => {
  const query = { userId };
  if (documentId) query.documentId = documentId;
  const skip = (page - 1) * limit;
  const [quizzes, total] = await Promise.all([
    Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .select('-questions').populate('documentId', 'title subject'),
    Quiz.countDocuments(query),
  ]);
  return { quizzes, total, page: parseInt(page), pages: Math.ceil(total / limit) };
};

const getQuizById = async (userId, quizId) => {
  const quiz = await Quiz.findById(quizId).populate('documentId', 'title subject');
  if (!quiz) throw createError('Quiz not found', 404);
  if (quiz.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
  return quiz;
};

module.exports = { generateQuiz, submitQuiz, getQuizHistory, getQuizById };
