const skillsMaster = require('../../generator/master/skills');

/**
 * Reverse-indexes the skills taxonomy (category -> [skill names]) into a
 * lowercased skill-name -> category lookup, so a matched skill can be
 * grouped into its practice area (Cloud, Backend, DevOps, ...). Shared by
 * skillGapAnalyzer.js and requirementSkillGap.js.
 */
function buildSkillCategoryMap() {
  const map = new Map();
  for (const [category, skills] of Object.entries(skillsMaster)) {
    for (const skill of skills) {
      map.set(skill.toLowerCase(), category);
    }
  }
  return map;
}

module.exports = { buildSkillCategoryMap };
