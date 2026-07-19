const { computeSkillGap } = require('../skillGap/skillGapAnalyzer');
const logger = require('../utils/logger');

/**
 * Handles GET /api/intelligence/skill-gap
 * Computes org-wide skill supply (real employee skill records) vs. demand
 * (real Active/Pipeline project technology requirements) - no fabricated
 * trends or forecasts, since there's no timestamped history to derive them
 * from.
 */
function getSkillGap(req, res) {
  try {
    const analysis = computeSkillGap();
    return res.status(200).json(analysis);
  } catch (err) {
    logger.error('Skill gap analysis failed.', err);
    return res.status(500).json({
      error: 'Internal Server Error during skill gap analysis.',
      message: err.message
    });
  }
}

module.exports = { getSkillGap };
