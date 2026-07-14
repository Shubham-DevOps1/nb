const { ingestResume } = require('../ingestion/ingestResume');
const logger = require('../utils/logger');

/**
 * Handles POST /api/resumes/upload
 * Expects a multipart form with field 'resume' containing a single PDF file.
 * Optional body fields: employeeId, name (for re-indexing an existing employee's resume).
 */
async function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: "Missing file. Attach a PDF under the 'resume' form field."
    });
  }

  const { employeeId, name } = req.body;

  logger.info(`Received resume upload: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    const result = await ingestResume({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      employeeId,
      name
    });

    return res.status(201).json({
      message: 'Resume ingested successfully',
      ...result
    });
  } catch (err) {
    logger.error(`Resume ingestion failed for file: ${req.file.originalname}`, err);
    return res.status(500).json({
      error: 'Internal Server Error during resume ingestion.',
      message: err.message
    });
  }
}

module.exports = {
  uploadResume
};
