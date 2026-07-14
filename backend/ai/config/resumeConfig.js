const path = require('path');

module.exports = {
  // Where raw uploaded PDF files are stored
  UPLOAD_DIR: path.join(__dirname, '..', 'data', 'uploads'),

  // Where parsed employee/resume JSON records are stored
  EMPLOYEE_STORE_DIR: path.join(__dirname, '..', 'data', 'employees'),

  // Accepted upload mimetype
  ALLOWED_MIME_TYPE: 'application/pdf',

  // Max upload size (5 MB)
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,

  // Chunking parameters (character-based, since BGE token limit is ~512 tokens)
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 150,

  // Dedicated ChromaDB collection for resume chunks (separate from the synthetic 'employees' collection)
  RESUME_COLLECTION_NAME: 'resume_chunks',

  // How many chunk hits to pull per query before aggregating back to employees
  CHUNK_RETRIEVAL_MULTIPLIER: 4
};
