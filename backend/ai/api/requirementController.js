const { parsePdfBuffer } = require('../parsing/pdfParser');
const { extractRequirements } = require('../requirements/requirementExtractor');
const { matchAllRequirements } = require('../requirements/resourceMatcher');
const { buildRequirementDocx } = require('../requirements/documentGenerator');
const logger = require('../utils/logger');

const MAX_REQUIREMENTS_PER_REMATCH = 25;

/**
 * Handles POST /api/requirements/analyze[?format=docx]
 * Expects a multipart form with field 'document' containing a single PDF
 * (a client project requirement doc / SRS). Extracts staffing requirements
 * via Gemini, then matches each against the employees Chroma collection.
 * Defaults to a JSON response; ?format=docx returns a downloadable Word
 * staffing proposal built from the same analysis.
 */
async function analyzeRequirementDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: "Missing file. Attach a PDF under the 'document' form field."
    });
  }

  logger.info(`Received requirement document: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    const { text } = await parsePdfBuffer(req.file.buffer);
    const requirements = await extractRequirements(text);
    const matches = await matchAllRequirements(requirements);

    const analysis = {
      sourceFile: req.file.originalname,
      requirementCount: requirements.length,
      matches
    };

    if (req.query.format === 'docx') {
      const buffer = await buildRequirementDocx(analysis);
      const downloadName = req.file.originalname.replace(/\.pdf$/i, '') + '-staffing-proposal.docx';
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${downloadName}"`
      });
      return res.status(200).send(buffer);
    }

    return res.status(200).json(analysis);
  } catch (err) {
    logger.error(`Requirement analysis failed for file: ${req.file.originalname}`, err);
    return res.status(500).json({
      error: 'Internal Server Error during requirement analysis.',
      message: err.message
    });
  }
}

/**
 * Handles POST /api/requirements/rematch
 * Re-scores an already-extracted set of requirements against the full
 * candidate pool using caller-supplied weights, rather than re-parsing the
 * source PDF - lets the UI's weight sliders re-rank live without
 * re-uploading or re-running Gemini extraction.
 */
async function rematchRequirements(req, res) {
  const { requirements, weights } = req.body || {};

  if (!Array.isArray(requirements) || requirements.length === 0) {
    return res.status(400).json({
      error: 'Missing requirements. Expected a non-empty array of previously extracted requirement objects.'
    });
  }

  if (requirements.length > MAX_REQUIREMENTS_PER_REMATCH) {
    return res.status(400).json({
      error: `Too many requirements. Maximum ${MAX_REQUIREMENTS_PER_REMATCH} per rematch request.`
    });
  }

  const invalid = requirements.find(r => !r || !Array.isArray(r.skills) || r.skills.length === 0 || !r.role);
  if (invalid) {
    return res.status(400).json({
      error: 'Each requirement must include a "role" and a non-empty "skills" array.'
    });
  }

  try {
    const matches = await matchAllRequirements(requirements, weights);
    return res.status(200).json({ matches });
  } catch (err) {
    logger.error('Requirement rematch failed.', err);
    return res.status(500).json({
      error: 'Internal Server Error during requirement rematch.',
      message: err.message
    });
  }
}

module.exports = {
  analyzeRequirementDocument,
  rematchRequirements
};
