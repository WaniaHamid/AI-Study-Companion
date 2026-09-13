const crypto = require('crypto');
const OpenAI = require('openai');
const Groq = require('groq-sdk');
const Document = require('../../models/Document');
const AILog = require('../../models/AILog');
const User = require('../../models/User');
const { createError } = require('../../middleware/errorHandler');
const { cacheGet, cacheSet } = require('../../config/redis');
const { publishEvent } = require('../../kafka/producer');

// Support both OpenAI and Groq (same interface)
const isGroq = !!process.env.GROQ_API_KEY;
const openai = isGroq
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONTEXT_MAX_CHARS = 8000;

const hashQuestion = (documentId, question) =>
  crypto.createHash('md5').update(`${documentId}:${question.toLowerCase().trim()}`).digest('hex');

const askQuestion = async (userId, { documentId, question }) => {
  if (!question || question.trim().length < 3) throw createError('Question is too short', 400);

  const doc = await Document.findById(documentId);
  if (!doc) throw createError('Document not found', 404);
  if (doc.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
  if (doc.status !== 'ready') throw createError('Document is still processing. Please wait.', 400);

  // Check Redis cache
  const cacheKey = `ai:qa:${hashQuestion(documentId, question)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    await AILog.create({ userId, documentId, type: 'qa', question, answer: cached.answer, fromCache: true });
    return { ...cached, fromCache: true };
  }

  const startTime = Date.now();
  const context = doc.extractedText.substring(0, CONTEXT_MAX_CHARS);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are an intelligent study assistant. Answer questions based ONLY on the provided document context. 
If the answer isn't in the context, say so clearly. Be concise but thorough. 
Format with markdown when helpful (lists, bold key terms).`,
      },
      {
        role: 'user',
        content: `Document: "${doc.title}"\n\nContext:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const answer = completion.choices[0].message.content;
  const tokensUsed = completion.usage?.total_tokens || 0;
  const responseTimeMs = Date.now() - startTime;

  const result = { answer, tokensUsed, responseTimeMs, documentTitle: doc.title, fromCache: false };

  await cacheSet(cacheKey, result, 7200);

  await Promise.all([
    AILog.create({ userId, documentId, type: 'qa', question, answer, tokensUsed, responseTimeMs }),
    User.findByIdAndUpdate(userId, { $inc: { 'progress.totalAIQuestions': 1 } }),
    Document.findByIdAndUpdate(documentId, { $inc: { aiQueryCount: 1 } }),
  ]);

  await publishEvent('ai_response_generated', {
    userId: userId.toString(),
    documentId: documentId.toString(),
    type: 'qa',
    timestamp: new Date().toISOString(),
  });

  return result;
};

const summarizeDocument = async (userId, documentId) => {
  const doc = await Document.findById(documentId);
  if (!doc) throw createError('Document not found', 404);
  if (doc.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
  if (doc.status !== 'ready') throw createError('Document is still processing', 400);

  const cacheKey = `ai:summary:${documentId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const context = doc.extractedText.substring(0, CONTEXT_MAX_CHARS);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Create a structured study summary of the document.
Include: 1) Key Concepts, 2) Main Topics, 3) Important Definitions, 4) Summary paragraph.
Use markdown formatting.`,
      },
      { role: 'user', content: `Summarize this document titled "${doc.title}":\n\n${context}` },
    ],
    max_tokens: 1500,
    temperature: 0.3,
  });

  const summary = completion.choices[0].message.content;
  const result = { summary, documentTitle: doc.title, tokensUsed: completion.usage?.total_tokens };

  await cacheSet(cacheKey, result, 14400);
  await AILog.create({ userId, documentId, type: 'summarize', question: 'summarize', answer: summary });

  return { ...result, fromCache: false };
};

// Returns chat history for a specific document in chronological order
const getChatHistory = async (userId, documentId, limit = 50) => {
  if (!documentId) return [];
  const logs = await AILog.find({ userId, documentId, type: 'qa' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('question answer fromCache tokensUsed createdAt');
  return logs.reverse(); // oldest first for chat display
};

module.exports = { askQuestion, summarizeDocument, getChatHistory };
