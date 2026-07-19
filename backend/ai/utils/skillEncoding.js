/**
 * Chroma metadata only accepts flat string/number/bool values, so per-skill
 * detail (level, years) can't be stored as nested arrays. ingestKnowledgeCards.js
 * encodes each skill as "name|level|years", joined by ";" - this parses that
 * back out. Shared by resourceMatcher.js and the skill-gap modules so both
 * read the same round-trip format the same way.
 */
function parseSkillsDetailed(encoded) {
  if (!encoded) return [];
  return encoded.split(';').filter(Boolean).map(entry => {
    const [name, level, years] = entry.split('|');
    return { name, level: level || '', yearsOfExperience: Number(years) || 0 };
  });
}

module.exports = { parseSkillsDetailed };
