const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadResume } = require('./resumeController');
const { askAboutCandidates } = require('./ragController');
const resumeConfig = require('../config/resumeConfig');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: resumeConfig.MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== resumeConfig.ALLOWED_MIME_TYPE) {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  }
});

/**
 * Runs multer manually so file-type/size rejections surface as 400s
 * instead of falling through to the generic 500 error handler.
 */
function handleUpload(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// Phase 1: Upload API
router.post('/resumes/upload', handleUpload, uploadResume);

// Phase 7: Gemini RAG
router.post('/resumes/ask', askAboutCandidates);

module.exports = router;
