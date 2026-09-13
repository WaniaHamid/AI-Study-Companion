const express = require('express');
const router = express.Router();
const { wrapController } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const analyticsService = require('../services/analytics/analyticsService');

router.use(protect);

// GET /api/analytics/user
router.get('/user', wrapController(async (req, res) => {
  const analytics = await analyticsService.getUserAnalytics(req.user._id);
  res.json({ success: true, data: analytics });
}));

module.exports = router;
