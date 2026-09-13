const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { wrapController } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../validators/schemas');
const authService = require('../services/auth/authService');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, try again in 15 minutes' },
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(schemas.register), wrapController(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Account created successfully', data: { user, accessToken, refreshToken } });
}));

// POST /api/auth/login
router.post('/login', authLimiter, validate(schemas.login), wrapController(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.json({ success: true, message: 'Login successful', data: { user, accessToken, refreshToken } });
}));

// POST /api/auth/refresh
router.post('/refresh', wrapController(async (req, res) => {
  const token = req.body.refreshToken || req.headers['x-refresh-token'];
  const tokens = await authService.refreshTokens(token);
  res.json({ success: true, data: tokens });
}));

// POST /api/auth/logout
router.post('/logout', protect, wrapController(async (req, res) => {
  await authService.logout(req.user._id);
  res.json({ success: true, message: 'Logged out successfully' });
}));

// GET /api/auth/profile
router.get('/profile', protect, wrapController(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  res.json({ success: true, data: { user } });
}));

// PATCH /api/auth/profile
router.patch('/profile', protect, wrapController(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.json({ success: true, message: 'Profile updated', data: { user } });
}));

module.exports = router;
