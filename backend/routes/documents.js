const express = require('express');
const router = express.Router();
const { wrapController } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const documentService = require('../services/document/documentService');

// All routes require auth
router.use(protect);

// POST /api/documents/upload
router.post('/upload', upload.single('file'), wrapController(async (req, res) => {
  const doc = await documentService.uploadDocument(req.user._id, req.file, req.body);
  res.status(201).json({ success: true, message: 'Document uploaded. Processing in background.', data: { document: doc } });
}));

// GET /api/documents/user
router.get('/user', wrapController(async (req, res) => {
  const result = await documentService.getUserDocuments(req.user._id, req.query);
  res.json({ success: true, data: result });
}));

// GET /api/documents/:id
router.get('/:id', wrapController(async (req, res) => {
  const doc = await documentService.getDocumentById(req.params.id, req.user._id);
  res.json({ success: true, data: { document: doc } });
}));

// DELETE /api/documents/:id
router.delete('/:id', wrapController(async (req, res) => {
  const result = await documentService.deleteDocument(req.params.id, req.user._id);
  res.json({ success: true, ...result });
}));

module.exports = router;
