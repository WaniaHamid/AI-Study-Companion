const mongoose = require('mongoose');
const Quiz = require('../../models/Quiz');
const Document = require('../../models/Document');
const AILog = require('../../models/AILog');
const User = require('../../models/User');
const { cacheGet, cacheSet } = require('../../config/redis');

const getUserAnalytics = async (userId) => {
  const cacheKey = `analytics:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const uid = new mongoose.Types.ObjectId(userId);

  const [
    user,
    quizStats,
    subjectBreakdown,
    recentActivity,
    documentStats,
    weakTopics,
    scoreOverTime,
  ] = await Promise.all([
    User.findById(userId).select('progress name'),

    // Overall quiz stats
    Quiz.aggregate([
      { $match: { userId: uid } },
      { $unwind: { path: '$attempts', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          avgScore: { $avg: '$attempts.percentage' },
          bestScore: { $max: '$attempts.percentage' },
          totalAttempts: { $sum: { $cond: [{ $ifNull: ['$attempts', false] }, 1, 0] } },
        },
      },
    ]),

    // Performance by subject
    Quiz.aggregate([
      { $match: { userId: uid, 'attempts.0': { $exists: true } } },
      { $unwind: '$attempts' },
      {
        $group: {
          _id: '$subject',
          avgScore: { $avg: '$attempts.percentage' },
          totalAttempts: { $sum: 1 },
          bestScore: { $max: '$attempts.percentage' },
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 },
    ]),

    // Recent 7 days quiz activity
    Quiz.aggregate([
      { $match: { userId: uid } },
      { $unwind: '$attempts' },
      {
        $match: {
          'attempts.completedAt': {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$attempts.completedAt' } },
          count: { $sum: 1 },
          avgScore: { $avg: '$attempts.percentage' },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Document stats
    Document.aggregate([
      { $match: { userId: uid } },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 },
          totalQuizzes: { $sum: '$quizCount' },
          totalAIQueries: { $sum: '$aiQueryCount' },
        },
      },
    ]),

    // Weak topics (lowest scoring)
    Quiz.aggregate([
      { $match: { userId: uid, 'attempts.0': { $exists: true } } },
      { $unwind: '$questions' },
      { $unwind: { path: '$attempts', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$questions.topic',
          avgScore: { $avg: '$attempts.percentage' },
          attempts: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: '' }, attempts: { $gte: 2 } } },
      { $sort: { avgScore: 1 } },
      { $limit: 5 },
    ]),

    // Score trend over last 10 quiz attempts
    Quiz.aggregate([
      { $match: { userId: uid, 'attempts.0': { $exists: true } } },
      { $unwind: '$attempts' },
      { $sort: { 'attempts.completedAt': -1 } },
      { $limit: 10 },
      {
        $project: {
          score: '$attempts.percentage',
          date: '$attempts.completedAt',
          quizTitle: '$title',
        },
      },
      { $sort: { date: 1 } },
    ]),
  ]);

  const result = {
    user: { name: user?.name, progress: user?.progress },
    overview: quizStats[0] || { totalQuizzes: 0, avgScore: 0, bestScore: 0, totalAttempts: 0 },
    subjectBreakdown,
    recentActivity,
    documentStats,
    weakTopics,
    scoreOverTime,
  };

  await cacheSet(cacheKey, result, 300); // 5-minute cache
  return result;
};

module.exports = { getUserAnalytics };
