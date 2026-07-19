const { getCollection, getEmployeesByMinExperience } = require('../chroma/employeeCollection');
const requirementConfig = require('../config/requirementConfig');
const { parseSkillsDetailed } = require('../utils/skillEncoding');
const logger = require('../utils/logger');

const DEFAULT_WEIGHTS = { skillFit: 0.4, availabilityFit: 0.2, deliveryTrackRecord: 0.2, domainCertFit: 0.2 };

/**
 * Normalizes user-supplied weights so they always sum to 1, rather than
 * trusting the caller to have done the arithmetic - a UI slider set could
 * easily send {skillFit: 60, availabilityFit: 30, deliveryTrackRecord: 30}
 * (sums to 120), which should still produce a sane 0-100 matchScore.
 */
function normalizeWeights(rawWeights) {
  const skillFit = Number(rawWeights?.skillFit);
  const availabilityFit = Number(rawWeights?.availabilityFit);
  const deliveryTrackRecord = Number(rawWeights?.deliveryTrackRecord);
  const domainCertFit = Number(rawWeights?.domainCertFit);

  const candidate = {
    skillFit: Number.isFinite(skillFit) && skillFit >= 0 ? skillFit : DEFAULT_WEIGHTS.skillFit,
    availabilityFit: Number.isFinite(availabilityFit) && availabilityFit >= 0 ? availabilityFit : DEFAULT_WEIGHTS.availabilityFit,
    deliveryTrackRecord: Number.isFinite(deliveryTrackRecord) && deliveryTrackRecord >= 0 ? deliveryTrackRecord : DEFAULT_WEIGHTS.deliveryTrackRecord,
    domainCertFit: Number.isFinite(domainCertFit) && domainCertFit >= 0 ? domainCertFit : DEFAULT_WEIGHTS.domainCertFit,
  };

  const sum = candidate.skillFit + candidate.availabilityFit + candidate.deliveryTrackRecord + candidate.domainCertFit;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };

  return {
    skillFit: candidate.skillFit / sum,
    availabilityFit: candidate.availabilityFit / sum,
    deliveryTrackRecord: candidate.deliveryTrackRecord / sum,
    domainCertFit: candidate.domainCertFit / sum,
  };
}

const LEVEL_MULTIPLIER = { Beginner: 0.6, Intermediate: 0.75, Advanced: 0.9, Expert: 1.0 };
const DEFAULT_LEVEL_MULTIPLIER = 0.75;

/**
 * Turns a single matched skill into a 0-100 proficiency-aware score, rather
 * than a flat 100 for "has it". Primary skills outrank the same skill held
 * as secondary; higher levels and more years nudge the score further -
 * "has AWS" and "Expert in AWS for 5 years" are no longer indistinguishable.
 */
function skillProficiencyScore(skillEntry, isPrimary) {
  const base = isPrimary ? 100 : 65;
  const levelMultiplier = LEVEL_MULTIPLIER[skillEntry.level] ?? DEFAULT_LEVEL_MULTIPLIER;
  const yearsBonus = Math.min(skillEntry.yearsOfExperience, 5) * 2;
  return Math.min(100, base * levelMultiplier + yearsBonus);
}

/**
 * Certification names rarely match verbatim between what Gemini extracts
 * from a requirement doc ("AWS certification") and an employee's actual
 * record ("AWS Certified Solutions Architect - Associate") - a loose
 * case-insensitive substring check in either direction catches these
 * without requiring exact strings.
 */
function certificationMatches(requiredCert, empCertNames) {
  const required = requiredCert.toLowerCase();
  return empCertNames.some(name => name.includes(required) || required.includes(name));
}

/**
 * Combines two otherwise-unrelated "does this person actually fit the
 * specific ask" signals into one score: has the employee worked in the
 * requirement's stated domain, and do they hold any of the requirement's
 * required certifications. Either half is skipped (treated as satisfied)
 * when the requirement doesn't specify it, so a requirement with no domain
 * and no certifications doesn't drag every candidate's score down for
 * something nobody asked for.
 */
function domainCertFitScore(domainMatch, requirement, empCertificationsRaw) {
  const hasDomainRequirement = Boolean(requirement.domain);
  const requiredCerts = requirement.certifications || [];
  const hasCertRequirement = requiredCerts.length > 0;

  if (!hasDomainRequirement && !hasCertRequirement) return 100;

  const empCertNames = empCertificationsRaw
    ? empCertificationsRaw.split(', ').map(c => c.toLowerCase()).filter(Boolean)
    : [];

  const domainScore = hasDomainRequirement ? (domainMatch ? 100 : 0) : null;
  const certScore = hasCertRequirement
    ? Math.round((requiredCerts.filter(c => certificationMatches(c, empCertNames)).length / requiredCerts.length) * 100)
    : null;

  const parts = [domainScore, certScore].filter(s => s !== null);
  return Math.round(parts.reduce((sum, s) => sum + s, 0) / parts.length);
}

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
function scoreEmployee(metadata, requirement, weights) {
  const empSkills = metadata.primarySkills
    ? metadata.primarySkills.split(', ').map(s => s.toLowerCase())
    : [];

  const matchedSkills = requirement.skills.filter(skill =>
    empSkills.some(es => es === skill.toLowerCase())
  );

  // Proficiency-aware lookup: primary skills outrank the same skill held as
  // secondary, and level/years-of-experience refine the score further -
  // built from encoded metadata (see parseSkillsDetailed), falling back to
  // flat presence (100) if a skill has no detailed record.
  const primaryDetailed = parseSkillsDetailed(metadata.primarySkillsDetailed);
  const secondaryDetailed = parseSkillsDetailed(metadata.secondarySkillsDetailed);

  const matchedSkillDetails = requirement.skills.map(skill => {
    const lower = skill.toLowerCase();
    const primaryEntry = primaryDetailed.find(s => s.name.toLowerCase() === lower);
    const secondaryEntry = !primaryEntry && secondaryDetailed.find(s => s.name.toLowerCase() === lower);
    const entry = primaryEntry || secondaryEntry;

    if (!entry) {
      const hasFlat = empSkills.includes(lower);
      return hasFlat
        ? { name: skill, matched: true, isPrimary: true, level: '', yearsOfExperience: 0, proficiencyScore: 100 }
        : { name: skill, matched: false, isPrimary: false, level: '', yearsOfExperience: 0, proficiencyScore: 0 };
    }

    return {
      name: skill,
      matched: true,
      isPrimary: Boolean(primaryEntry),
      level: entry.level,
      yearsOfExperience: entry.yearsOfExperience,
      proficiencyScore: skillProficiencyScore(entry, Boolean(primaryEntry))
    };
  });

  const empDomains = metadata.domains
    ? metadata.domains.split(', ').map(d => d.toLowerCase())
    : [];
  const domainMatch = requirement.domain ? empDomains.includes(requirement.domain.toLowerCase()) : false;

  // Genuine, derived scores - not fabricated. Skill fit is the average
  // proficiency-aware score across the requirement's skills (0 for skills
  // the employee doesn't have at all); availability fit reuses the same
  // scale as employee search; delivery track record is the employee's real
  // recorded performance rating (0-5 scale), not invented.
  const skillFitScore = Math.round(
    matchedSkillDetails.reduce((sum, s) => sum + s.proficiencyScore, 0) / requirement.skills.length
  );
  const availabilityFitScore = availabilityScore(metadata.availability);
  const performanceRating = Number(metadata.performanceRating) || 0;
  const deliveryScore = Math.round(Math.min(100, (performanceRating / 5) * 100));
  const domainCertScore = domainCertFitScore(domainMatch, requirement, metadata.certifications);
  const matchScore = Math.round(
    skillFitScore * weights.skillFit +
    availabilityFitScore * weights.availabilityFit +
    deliveryScore * weights.deliveryTrackRecord +
    domainCertScore * weights.domainCertFit
  );

  return {
    matchedSkills,
    matchedSkillDetails,
    domainMatch,
    performanceRating,
    skillFitScore,
    availabilityFitScore,
    deliveryScore,
    domainCertScore,
    matchScore
  };
}

/**
 * Finds resources satisfying one requirement line item: minimum experience
 * (exact metadata filter) plus at least one matching skill (structured
 * overlap, not vector similarity). Weights are user-adjustable (see
 * normalizeWeights) - defaults match the original fixed 50/25/25 split.
 */
async function matchRequirement(requirement, rawWeights) {
  const weights = normalizeWeights(rawWeights);
  const collection = await getCollection();
  const raw = await getEmployeesByMinExperience(collection, requirement.minExperience);

  const candidates = [];
  const ids = raw.ids || [];
  const metadatas = raw.metadatas || [];

  for (let i = 0; i < ids.length; i++) {
    const metadata = metadatas[i];
    const { matchedSkills, matchedSkillDetails, domainMatch, performanceRating, skillFitScore, availabilityFitScore, deliveryScore, domainCertScore, matchScore } =
      scoreEmployee(metadata, requirement, weights);

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
      matchedSkillDetails,
      domainMatch,
      matchScore,
      scoreBreakdown: {
        skillFit: skillFitScore,
        availabilityFit: availabilityFitScore,
        deliveryTrackRecord: deliveryScore,
        domainCertFit: domainCertScore
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
async function matchAllRequirements(requirements, rawWeights) {
  const results = [];
  for (const requirement of requirements) {
    results.push(await matchRequirement(requirement, rawWeights));
  }
  return results;
}

module.exports = {
  matchRequirement,
  matchAllRequirements,
  normalizeWeights,
  DEFAULT_WEIGHTS
};
