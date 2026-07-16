const { getCollection, getEmployeesByMinExperience } = require('../chroma/employeeCollection');
const requirementConfig = require('../config/requirementConfig');
const logger = require('../utils/logger');

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

  return { matchedSkills, domainMatch };
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
    const { matchedSkills, domainMatch } = scoreEmployee(metadata, requirement);

    if (matchedSkills.length === 0) continue;

    candidates.push({
      employeeId: ids[i],
      name: metadata.name || 'Unknown',
      designation: metadata.designation || 'Unknown',
      department: metadata.department || 'Unknown',
      location: metadata.location || 'Unknown',
      availability: metadata.availability || 'Unknown',
      experience: Number(metadata.experience) || 0,
      matchedSkills,
      domainMatch
    });
  }

  // Rank by: more matched skills first, then domain match, then experience.
  candidates.sort((a, b) => {
    if (b.matchedSkills.length !== a.matchedSkills.length) {
      return b.matchedSkills.length - a.matchedSkills.length;
    }
    if (b.domainMatch !== a.domainMatch) {
      return b.domainMatch ? 1 : -1;
    }
    return b.experience - a.experience;
  });

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
