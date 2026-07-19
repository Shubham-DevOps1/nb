const { loadJsonFile } = require('../utils/fileLoader');
const { buildSkillCategoryMap } = require('../utils/skillTaxonomy');

// "Current and upcoming project demand" (per the module's stated purpose) -
// Completed projects are history, not demand.
const DEMAND_STATUSES = ['Active', 'Pipeline'];

const TOP_MISSING_SKILLS_LIMIT = 8;
const SKILL_GAP_TABLE_LIMIT = 30;
const RECOMMENDED_CAPACITY_LIMIT = 6;

let cache = null;

/**
 * Available supply per skill: distinct employees who hold it (primary or
 * secondary) - a real headcount, not a weighted score, so it can be
 * compared apples-to-apples against demand.
 */
function computeSkillSupply(employees) {
  const supply = new Map(); // lowerName -> { name, count }
  employees.forEach(emp => {
    const allSkills = [...(emp.primarySkills || []), ...(emp.secondarySkills || [])];
    const seenForThisEmployee = new Set();
    allSkills.forEach(s => {
      const lower = s.name.toLowerCase();
      if (seenForThisEmployee.has(lower)) return;
      seenForThisEmployee.add(lower);
      if (!supply.has(lower)) supply.set(lower, { name: s.name, count: 0 });
      supply.get(lower).count += 1;
    });
  });
  return supply;
}

/**
 * Demand per skill: each Active/Pipeline project's teamSize is split evenly
 * across its listed technologies, turning "this project needs 11 people and
 * touches 7 technologies" into a people-equivalent contribution per skill -
 * the only way to get demand into the same headcount units as supply
 * without inventing a number.
 */
function computeSkillDemand(projects) {
  const demand = new Map(); // lowerName -> { name, demand }
  projects
    .filter(p => DEMAND_STATUSES.includes(p.status))
    .forEach(p => {
      const techs = p.technologies || [];
      if (techs.length === 0 || !p.teamSize) return;
      const perSkillShare = p.teamSize / techs.length;
      techs.forEach(t => {
        const lower = t.toLowerCase();
        if (!demand.has(lower)) demand.set(lower, { name: t, demand: 0 });
        demand.get(lower).demand += perSkillShare;
      });
    });
  return demand;
}

/**
 * Distinct employees per taxonomy category (Cloud/Backend/DevOps/...) - a
 * person with three Cloud skills counts once toward Cloud capacity, not
 * three times, unlike a naive sum of per-skill supply.
 */
function computeCategorySupply(employees, skillCategoryMap) {
  const categorySets = new Map(); // category -> Set(employeeId)
  employees.forEach(emp => {
    const allSkills = [...(emp.primarySkills || []), ...(emp.secondarySkills || [])];
    const categories = new Set();
    allSkills.forEach(s => {
      const category = skillCategoryMap.get(s.name.toLowerCase());
      if (category) categories.add(category);
    });
    categories.forEach(category => {
      if (!categorySets.has(category)) categorySets.set(category, new Set());
      categorySets.get(category).add(emp.employeeId);
    });
  });
  return categorySets;
}

function computeSkillGap() {
  if (cache) return cache;

  const employees = loadJsonFile('employees.json');
  const projects = loadJsonFile('projects.json');
  const skillCategoryMap = buildSkillCategoryMap();

  const supply = computeSkillSupply(employees);
  const demand = computeSkillDemand(projects);
  const categorySupply = computeCategorySupply(employees, skillCategoryMap);

  const allLowerSkillNames = new Set([...supply.keys(), ...demand.keys()]);
  const skillRows = [];

  allLowerSkillNames.forEach(lower => {
    const supplyEntry = supply.get(lower);
    const demandEntry = demand.get(lower);
    const required = Math.round(demandEntry?.demand || 0);

    // A skill nobody's current/upcoming project needs isn't an org "gap",
    // even if supply happens to be thin - only surface skills in real demand.
    if (required === 0) return;

    const name = demandEntry.name;
    const available = supplyEntry?.count || 0;
    const gap = Math.max(0, required - available);
    const gapPercentage = Math.round((gap / required) * 100);
    const category = skillCategoryMap.get(lower) || 'Other';

    skillRows.push({ skill: name, category, required, available, gap, gapPercentage });
  });

  // Sorted by absolute gap, not gapPercentage - any zero-supply skill hits
  // exactly 100% regardless of whether 15 or 15,000 people are needed, so
  // ranking by percentage ties every fully-uncovered niche skill at the
  // ceiling and buries genuinely bigger shortfalls (e.g. React short by 725
  // people, at "only" 88%) underneath them.
  skillRows.sort((a, b) => b.gap - a.gap);

  const topMissingSkills = skillRows.filter(r => r.gap > 0).slice(0, TOP_MISSING_SKILLS_LIMIT);

  const categoryDemand = new Map();
  demand.forEach((entry, lower) => {
    const category = skillCategoryMap.get(lower) || 'Other';
    categoryDemand.set(category, (categoryDemand.get(category) || 0) + entry.demand);
  });

  const categoryGaps = Array.from(categoryDemand.entries())
    .map(([category, demandSum]) => {
      const required = Math.round(demandSum);
      const available = categorySupply.get(category)?.size || 0;
      const gap = Math.max(0, required - available);
      const gapPercentage = required > 0 ? Math.round((gap / required) * 100) : 0;
      return { category, required, available, gap, gapPercentage };
    })
    .sort((a, b) => b.gap - a.gap);

  const recommendedCapacity = categoryGaps
    .filter(c => c.gap > 0)
    .slice(0, RECOMMENDED_CAPACITY_LIMIT)
    .map(c => ({ category: c.category, additionalCapacityNeeded: c.gap }));

  cache = {
    generatedAt: new Date().toISOString(),
    totalEmployees: employees.length,
    demandProjectCount: projects.filter(p => DEMAND_STATUSES.includes(p.status)).length,
    topMissingSkills,
    skillGapTable: skillRows.slice(0, SKILL_GAP_TABLE_LIMIT),
    categoryGaps,
    recommendedCapacity
  };

  return cache;
}

module.exports = { computeSkillGap };
