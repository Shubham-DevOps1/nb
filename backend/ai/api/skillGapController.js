const { computeSkillGap } = require('../skillGap/skillGapAnalyzer');
const { computeRequirementSkillGap } = require('../skillGap/requirementSkillGap');
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

/**
 * Handles POST /api/intelligence/requirement-skill-gap
 * Scoped to a single already-extracted requirement (role/skills/count/
 * minExperience) - checks whether the eligible candidate pool has enough
 * people per required skill, and suggests real employees to upskill where
 * it doesn't.
 */
async function getRequirementSkillGap(req, res) {
  const requirement = req.body || {};

  if (!requirement.role || !Array.isArray(requirement.skills) || requirement.skills.length === 0) {
    return res.status(400).json({
      error: 'Request body must include "role" and a non-empty "skills" array.'
    });
  }

  if (!Number.isFinite(requirement.count) || requirement.count <= 0) {
    return res.status(400).json({
      error: '"count" must be a positive number.'
    });
  }

  try {
    const analysis = await computeRequirementSkillGap(requirement);
    return res.status(200).json(analysis);
  } catch (err) {
    logger.error('Requirement skill gap analysis failed.', err);
    return res.status(500).json({
      error: 'Internal Server Error during requirement skill gap analysis.',
      message: err.message
    });
  }
}

module.exports = { getSkillGap, getRequirementSkillGap };
