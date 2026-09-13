require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initKafkaProducer } = require('./kafka/producer');
const { startKafkaConsumers } = require('./kafka/consumer');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const quizRoutes = require('./routes/quiz');
const analyticsRoutes = require('./routes/analytics');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// --- Ensure upload directory exists ---
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Security Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- Global Rate Limiter ---
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// --- Body Parsing ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Logging ---
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --- Static Files (uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI Study Companion API is running', timestamp: new Date() });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    if (process.env.NODE_ENV !== 'test') {
      try {
        await initKafkaProducer();
        await startKafkaConsumers();
        console.log('✅ Kafka connected');
      } catch (kafkaError) {
        console.warn('⚠️  Kafka not available — running without event streaming:', kafkaError.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
