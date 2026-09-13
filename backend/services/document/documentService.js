const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Document = require('../../models/Document');
const User = require('../../models/User');
const { createError } = require('../../middleware/errorHandler');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../../config/redis');
const { publishEvent } = require('../../kafka/producer');

const extractText = async (filePath, mimeType) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (['.txt', '.md'].includes(ext)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
  } catch (error) {
    console.error('Text extraction error:', error.message);
    return '';
  }
};

const uploadDocument = async (userId, file, { title, subject, tags }) => {
  if (!file) throw createError('No file uploaded', 400);

  const doc = await Document.create({
    userId,
    title: title || file.originalname.replace(/\.[^/.]+$/, ''),
    originalName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    mimeType: file.mimetype,
    fileSize: file.size,
    subject: subject || 'General',
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    status: 'processing',
  });

  // Extract text asynchronously
  setImmediate(async () => {
    try {
      const text = await extractText(file.path, file.mimetype);
      doc.extractedText = text;
      doc.textLength = text.length;
      doc.status = text ? 'ready' : 'failed';
      if (!text) doc.processingError = 'Could not extract text from file';
      await doc.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'progress.totalDocumentsUploaded': 1 },
      });

      // Publish Kafka event
      await publishEvent('document_uploaded', {
        documentId: doc._id.toString(),
        userId: userId.toString(),
        title: doc.title,
        textLength: text.length,
        timestamp: new Date().toISOString(),
      });

      // Invalidate cache
      await cacheDelPattern(`docs:user:${userId}*`);
    } catch (err) {
      doc.status = 'failed';
      doc.processingError = err.message;
      await doc.save();
    }
  });

  return doc;
};

const getUserDocuments = async (userId, { page = 1, limit = 10, subject, search } = {}) => {
  const cacheKey = `docs:user:${userId}:${page}:${limit}:${subject || ''}:${search || ''}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const query = { userId };
  if (subject) query.subject = subject;
  if (search) query.$or = [
    { title: { $regex: search, $options: 'i' } },
    { tags: { $in: [new RegExp(search, 'i')] } },
  ];

  const skip = (page - 1) * limit;
  const [documents, total] = await Promise.all([
    Document.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-extractedText'),
    Document.countDocuments(query),
  ]);

  const result = { documents, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  await cacheSet(cacheKey, result, 120);
  return result;
};

const getDocumentById = async (documentId, userId) => {
  const cacheKey = `doc:${documentId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    if (cached.userId.toString() !== userId.toString()) throw createError('Access denied', 403);
    return cached;
  }

  const doc = await Document.findById(documentId);
  if (!doc) throw createError('Document not found', 404);
  if (doc.userId.toString() !== userId.toString()) throw createError('Access denied', 403);

  await cacheSet(cacheKey, doc.toObject(), 300);
  return doc;
};

const deleteDocument = async (documentId, userId) => {
  const doc = await Document.findById(documentId);
  if (!doc) throw createError('Document not found', 404);
  if (doc.userId.toString() !== userId.toString()) throw createError('Access denied', 403);

  // Remove file from disk
  const filePath = path.join(__dirname, '../..', doc.fileUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await Document.findByIdAndDelete(documentId);
  await cacheDel(`doc:${documentId}`);
  await cacheDelPattern(`docs:user:${userId}*`);

  return { message: 'Document deleted successfully' };
};

module.exports = { uploadDocument, getUserDocuments, getDocumentById, deleteDocument };
