const { getCollection, getEmployeesByMinExperience } = require('../chroma/employeeCollection');
const { parseSkillsDetailed } = require('../utils/skillEncoding');
const { buildSkillCategoryMap } = require('../utils/skillTaxonomy');

const UPSKILL_CANDIDATES_LIMIT = 5;

/**
 * Flattens one employee's Chroma metadata into a lowercased skill-name set
 * (primary + secondary + the flat presence-only field, as a fallback for
 * older/undetailed records) and the practice-area categories those skills
 * belong to - the two things needed to check "has this skill" and "has
 * adjacent experience" without re-deriving them per required skill.
 */
function buildEmployeeSkillProfile(metadata, skillCategoryMap) {
  const primary = parseSkillsDetailed(metadata.primarySkillsDetailed);
  const secondary = parseSkillsDetailed(metadata.secondarySkillsDetailed);
  const flatNames = metadata.primarySkills ? metadata.primarySkills.split(', ').map(s => s.toLowerCase()) : [];

  const skillNames = new Set([
    ...primary.map(s => s.name.toLowerCase()),
    ...secondary.map(s => s.name.toLowerCase()),
    ...flatNames,
  ]);

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
    skillNames,
    skillCategories,
  };
}

/**
 * For one requirement, checks whether the eligible pool (employees meeting
 * minExperience) has enough people per required skill to fill the headcount
 * asked for - and where it doesn't, suggests real employees to upskill:
 * people in the same practice area who already hold most of the OTHER
 * required skills, just not this one. Not a course recommendation (no
 * training catalog exists) - a "who's closest" recommendation, from real
 * skill records only.
 */
async function computeRequirementSkillGap(requirement) {
  const collection = await getCollection();
  const raw = await getEmployeesByMinExperience(collection, requirement.minExperience);
  const metadatas = raw.metadatas || [];

  const skillCategoryMap = buildSkillCategoryMap();
  const employeePool = metadatas.map(metadata => buildEmployeeSkillProfile(metadata, skillCategoryMap));

  const skillCoverage = requirement.skills.map(skill => {
    const lower = skill.toLowerCase();
    const category = skillCategoryMap.get(lower) || 'Other';

    const withSkill = employeePool.filter(e => e.skillNames.has(lower));
    const employeesWithSkill = withSkill.length;
    const shortfall = Math.max(0, requirement.count - employeesWithSkill);

    let upskillCandidates = [];
    if (shortfall > 0) {
      upskillCandidates = employeePool
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
    eligiblePoolSize: employeePool.length,
    skillCoverage,
  };
}

module.exports = { computeRequirementSkillGap };
