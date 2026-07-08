const logger = require('../utils/logger');

/**
 * Checks if a candidate is a True Positive based on query evaluation criteria.
 */
function isTruePositive(meta, doc, criteria) {
  if (!meta || !criteria) return false;

  const docLower = (doc || '').toLowerCase();

  // 1. Validate Designation
  if (criteria.designation) {
    if (!meta.designation || meta.designation.toLowerCase() !== criteria.designation.toLowerCase()) {
      return false;
    }
  }

  // 2. Validate Skills
  if (criteria.skills && criteria.skills.length > 0) {
    const empSkills = meta.primarySkills ? meta.primarySkills.split(', ').map(s => s.toLowerCase()) : [];
    
    const hasSkill = criteria.skills.some(cs => {
      const csLower = cs.toLowerCase();
      // Check in primary skills list or in the full narrative document
      return empSkills.some(es => es.includes(csLower) || csLower.includes(es)) || docLower.includes(csLower);
    });

    if (!hasSkill) return false;
  }

  // 3. Validate Domains
  if (criteria.domains && criteria.domains.length > 0) {
    const empDomains = meta.domains ? meta.domains.split(', ').map(d => d.toLowerCase()) : [];
    
    const hasDomain = criteria.domains.some(cd => {
      const cdLower = cd.toLowerCase();
      return empDomains.some(ed => ed.includes(cdLower) || cdLower.includes(ed)) || docLower.includes(cdLower);
    });

    if (!hasDomain) return false;
  }

  return true;
}

/**
 * Calculates Precision@K (typically Precision@5).
 */
function calculatePrecisionAtK(results, criteria, k = 5) {
  if (!results || results.length === 0) return 0;
  
  const topKResults = results.slice(0, k);
  let truePositives = 0;

  topKResults.forEach(res => {
    // If results come from semantic search directly, they will have metadata and document
    // If from ranking, they might have metadata fields directly
    const meta = res.metadata || res;
    const doc = res.document || (res.metadata ? res.metadata.knowledgeCard : '');
    
    if (isTruePositive(meta, doc, criteria)) {
      truePositives++;
    }
  });

  return truePositives / Math.min(k, results.length);
}

/**
 * Calculates Recall based on total actual relevant items in the full database.
 */
function calculateRecall(results, criteria, totalActualRelevant) {
  if (totalActualRelevant === 0) return 1.0; // Avoid divide by zero, default to perfect recall if none exist
  if (!results || results.length === 0) return 0.0;

  let truePositivesRetrieved = 0;
  results.forEach(res => {
    const meta = res.metadata || res;
    const doc = res.document || '';
    if (isTruePositive(meta, doc, criteria)) {
      truePositivesRetrieved++;
    }
  });

  return truePositivesRetrieved / totalActualRelevant;
}

/**
 * Calculates Mean Reciprocal Rank (MRR).
 */
function calculateMRR(results, criteria) {
  if (!results || results.length === 0) return 0;

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const meta = res.metadata || res;
    const doc = res.document || '';
    
    if (isTruePositive(meta, doc, criteria)) {
      return 1 / (i + 1);
    }
  }

  return 0;
}

module.exports = {
  isTruePositive,
  calculatePrecisionAtK,
  calculateRecall,
  calculateMRR
};
