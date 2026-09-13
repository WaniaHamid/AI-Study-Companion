const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { createError } = require('../../middleware/errorHandler');
const { cacheSet, cacheDel } = require('../../config/redis');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw createError('Email already registered', 409);

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw createError('Invalid email or password', 401);
  }
  if (!user.isActive) throw createError('Account is deactivated', 403);

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  user.progress.lastActive = new Date();
  await user.save();

  // Invalidate old user cache
  await cacheDel(`user:${user._id}`);

  return { user, accessToken, refreshToken };
};

const refreshTokens = async (token) => {
  if (!token) throw createError('Refresh token required', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw createError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw createError('Refresh token is invalid', 401);
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();
  await cacheDel(`user:${user._id}`);

  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  await cacheDel(`user:${userId}`);
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);
  return user;
};

const updateProfile = async (userId, updates) => {
  const allowed = ['name', 'avatar', 'preferences'];
  const filtered = Object.keys(updates)
    .filter(key => allowed.includes(key))
    .reduce((obj, key) => { obj[key] = updates[key]; return obj; }, {});

  const user = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });
  if (!user) throw createError('User not found', 404);
  await cacheDel(`user:${userId}`);
  return user;
};

module.exports = { register, login, refreshTokens, logout, getProfile, updateProfile };
