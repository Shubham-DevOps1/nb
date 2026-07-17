const express = require('express');
const multer = require('multer');
const router = express.Router();
const { chat } = require('./chatController');
const requirementConfig = require('../config/requirementConfig');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: requirementConfig.MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== requirementConfig.ALLOWED_MIME_TYPE) {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  }
});

/**
 * Runs multer manually so file-type/size rejections surface as 400s
 * instead of falling through to the generic 500 error handler. The
 * document field is optional here (unlike resume/requirement upload) -
 * a chat message with no attachment is the common case.
 */
function handleUpload(req, res, next) {
  upload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.post('/chat', handleUpload, chat);

module.exports = router;
