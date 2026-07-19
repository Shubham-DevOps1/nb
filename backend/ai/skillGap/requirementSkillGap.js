const { getCollection, getEmployeesByMinExperience } = require('../chroma/employeeCollection');
const { parseSkillsDetailed } = require('../utils/skillEncoding');
const { buildSkillCategoryMap } = require('../utils/skillTaxonomy');

const UPSKILL_CANDIDATES_LIMIT = 5;

/**
 * Flattens one employee's Chroma metadata into two skill-name sets, mirroring
 * the two-tier check resourceMatcher.js's scoreEmployee actually applies:
 * primarySkillNames (what gates whether AI Recommendations surfaces this
 * person for a requirement at all - primary skills only) and skillNames
 * (primary + secondary, what the detailed per-skill proficiency scoring
 * checks once someone's in). Using primary+secondary for the pool-inclusion
 * gate here would count people AI Recommendations itself never surfaces.
 * skillCategories (practice areas this person has any experience in) is
 * derived from the broader set, for upskill-candidate adjacency checks.
 */
function buildEmployeeSkillProfile(metadata, skillCategoryMap) {
  const primary = parseSkillsDetailed(metadata.primarySkillsDetailed);
  const secondary = parseSkillsDetailed(metadata.secondarySkillsDetailed);
  const flatPrimaryNames = metadata.primarySkills ? metadata.primarySkills.split(', ').map(s => s.toLowerCase()) : [];

  const primarySkillNames = new Set([...primary.map(s => s.name.toLowerCase()), ...flatPrimaryNames]);
  const skillNames = new Set([...primarySkillNames, ...secondary.map(s => s.name.toLowerCase())]);

  const skillCategories = new Set();
  skillNames.forEach(name => {
    const category = skillCategoryMap.get(name);
    if (category) skillCategories.add(category);
  });

  return {
    employeeId: metadata.employeeId,
    name: metadata.name || 'Unknown',
    designation: metadata.designation || 'Unknown',
    department: metadata.department || 'Unknown',
    experience: Number(metadata.experience) || 0,
    performanceRating: Number(metadata.performanceRating) || 0,
    primarySkillNames,
    skillNames,
    skillCategories,
  };
}

/**
 * For one requirement, checks whether the same pool AI Recommendations
 * already surfaced (employees meeting minExperience AND holding at least
 * one of the requirement's skills - identical filter to resourceMatcher.js's
 * matchRequirement) has enough people per required skill to fill the
 * headcount asked for - and where it doesn't, suggests real employees to
 * upskill: people in the same practice area who already hold most of the
 * OTHER required skills, just not this one. Not a course recommendation (no
 * training catalog exists) - a "who's closest" recommendation, from real
 * skill records only. Scoped to the matched pool rather than every employee
 * above the experience bar, since someone with zero overlap with the role
 * (e.g. an HR generalist who happens to meet minExperience) was never a
 * candidate for it in the first place.
 */
async function computeRequirementSkillGap(requirement) {
  const collection = await getCollection();
  const raw = await getEmployeesByMinExperience(collection, requirement.minExperience);
  const metadatas = raw.metadatas || [];

  const skillCategoryMap = buildSkillCategoryMap();
  const requiredSkillsLower = requirement.skills.map(s => s.toLowerCase());

  const matchedPool = metadatas
    .map(metadata => buildEmployeeSkillProfile(metadata, skillCategoryMap))
    .filter(e => requiredSkillsLower.some(skill => e.primarySkillNames.has(skill)));

  const skillCoverage = requirement.skills.map(skill => {
    const lower = skill.toLowerCase();
    const category = skillCategoryMap.get(lower) || 'Other';

    const withSkill = matchedPool.filter(e => e.skillNames.has(lower));
    const employeesWithSkill = withSkill.length;
    const shortfall = Math.max(0, requirement.count - employeesWithSkill);

    let upskillCandidates = [];
    if (shortfall > 0) {
      upskillCandidates = matchedPool
        .filter(e => !e.skillNames.has(lower) && e.skillCategories.has(category))
        .map(e => {
          const matchedOtherSkills = requirement.skills.filter(
            s => s.toLowerCase() !== lower && e.skillNames.has(s.toLowerCase())
          );
          return { ...e, matchedOtherSkillsCount: matchedOtherSkills.length, matchedOtherSkills };
        })
        .sort((a, b) =>
          b.matchedOtherSkillsCount - a.matchedOtherSkillsCount ||
          b.performanceRating - a.performanceRating ||
          b.experience - a.experience
        )
        .slice(0, UPSKILL_CANDIDATES_LIMIT)
        .map(e => ({
          employeeId: e.employeeId,
          name: e.name,
          designation: e.designation,
          department: e.department,
          experience: e.experience,
          matchedOtherSkills: e.matchedOtherSkills,
        }));
    }

    return { skill, category, employeesWithSkill, needed: requirement.count, shortfall, upskillCandidates };
  });

  return {
    role: requirement.role,
    count: requirement.count,
    minExperience: requirement.minExperience,
    matchedCandidatePoolSize: matchedPool.length,
    skillCoverage,
  };
}

module.exports = { computeRequirementSkillGap };
