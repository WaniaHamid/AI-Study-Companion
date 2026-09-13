const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('./errorHandler');
const { cacheGet, cacheSet } = require('../config/redis');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError('No token provided. Access denied.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check Redis cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(decoded.id).select('-password');
      if (!user) return next(createError('User not found', 401));
      await cacheSet(cacheKey, user.toObject(), 300); // cache 5 min
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(createError('Insufficient permissions', 403));
  }
  next();
};

module.exports = { protect, requireRole };
