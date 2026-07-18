const { getCollection, getEmployeesByMinExperience } = require('../chroma/employeeCollection');
const requirementConfig = require('../config/requirementConfig');
const logger = require('../utils/logger');

/**
 * Same availability -> score convention used in rankingEngine.js's business
 * ranking, reused here so "availability fit" means the same thing across
 * both features rather than inventing a second scale.
 */
function availabilityScore(availability) {
  const avail = (availability || '').toLowerCase();
  if (avail === 'available') return 100;
  if (avail.includes('2 weeks')) return 75;
  if (avail.includes('1 month')) return 50;
  if (avail === 'allocated') return 25;
  return 50;
}

/**
 * Scores one employee's metadata against a requirement's skill/domain list.
 * Structured overlap counting rather than semantic similarity, since a
 * requirement asks "does this exact skill exist" not "is this related".
 */
function scoreEmployee(metadata, requirement) {
  const empSkills = metadata.primarySkills
    ? metadata.primarySkills.split(', ').map(s => s.toLowerCase())
    : [];

  const matchedSkills = requirement.skills.filter(skill =>
    empSkills.some(es => es === skill.toLowerCase())
  );

  const empDomains = metadata.domains
    ? metadata.domains.split(', ').map(d => d.toLowerCase())
    : [];
  const domainMatch = requirement.domain ? empDomains.includes(requirement.domain.toLowerCase()) : false;

  // Genuine, derived scores - not fabricated. Skill fit is the fraction of
  // the requirement's skills this person actually has; availability fit
  // reuses the same scale as employee search; delivery track record is the
  // employee's real recorded performance rating (0-5 scale), not invented.
  const skillFitScore = Math.round((matchedSkills.length / requirement.skills.length) * 100);
  const availabilityFitScore = availabilityScore(metadata.availability);
  const performanceRating = Number(metadata.performanceRating) || 0;
  const deliveryScore = Math.round(Math.min(100, (performanceRating / 5) * 100));
  const matchScore = Math.round(skillFitScore * 0.5 + availabilityFitScore * 0.25 + deliveryScore * 0.25);

  return {
    matchedSkills,
    domainMatch,
    performanceRating,
    skillFitScore,
    availabilityFitScore,
    deliveryScore,
    matchScore
  };
}

/**
 * Finds resources satisfying one requirement line item: minimum experience
 * (exact metadata filter) plus at least one matching skill (structured
 * overlap, not vector similarity).
 */
async function matchRequirement(requirement) {
  const collection = await getCollection();
  const raw = await getEmployeesByMinExperience(collection, requirement.minExperience);

  const candidates = [];
  const ids = raw.ids || [];
  const metadatas = raw.metadatas || [];

  for (let i = 0; i < ids.length; i++) {
    const metadata = metadatas[i];
    const { matchedSkills, domainMatch, performanceRating, skillFitScore, availabilityFitScore, deliveryScore, matchScore } =
      scoreEmployee(metadata, requirement);

    if (matchedSkills.length === 0) continue;

    candidates.push({
      employeeId: ids[i],
      name: metadata.name || 'Unknown',
      designation: metadata.designation || 'Unknown',
      department: metadata.department || 'Unknown',
      location: metadata.location || 'Unknown',
      availability: metadata.availability || 'Unknown',
      experience: Number(metadata.experience) || 0,
      performanceRating,
      matchedSkills,
      domainMatch,
      matchScore,
      scoreBreakdown: {
        skillFit: skillFitScore,
        availabilityFit: availabilityFitScore,
        deliveryTrackRecord: deliveryScore
      }
    });
  }

  // Rank by the same weighted score shown to the user, not a separate
  // internal order - what you see is what decided the ranking.
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  const matchedCount = candidates.length;
  const resources = candidates.slice(0, requirementConfig.MAX_RESOURCES_PER_REQUIREMENT);

  logger.info(`Requirement "${requirement.role}" (skills: ${requirement.skills.join(', ')}, minExp: ${requirement.minExperience}) matched ${matchedCount} resource(s)`);

  return {
    ...requirement,
    matchedCount,
    sufficientResources: matchedCount >= requirement.count,
    resources
  };
}

/**
 * Matches every requirement line item and returns them in the same order.
 */
async function matchAllRequirements(requirements) {
  const results = [];
  for (const requirement of requirements) {
    results.push(await matchRequirement(requirement));
  }
  return results;
}

module.exports = {
  matchRequirement,
  matchAllRequirements
};
