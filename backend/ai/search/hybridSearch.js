const { performSemanticSearch } = require('./semanticSearch');
const logger = require('../utils/logger');

/**
 * Builds ChromaDB's native query filter object from a flat javascript filter object.
 * Supports:
 * - experienceMin (maps to experience >= min)
 * - experienceMax (maps to experience <= max)
 * - department (maps to department == value)
 * - designation (maps to designation == value)
 * - location (maps to location == value)
 * - availability (maps to availability == value)
 */
function buildChromaFilter(filters) {
  if (!filters || Object.keys(filters).length === 0) return null;

  const chromaFilters = [];

  // Minimum Experience
  if (filters.experienceMin !== undefined && filters.experienceMin !== null && filters.experienceMin !== '') {
    const minVal = Number(filters.experienceMin);
    if (!isNaN(minVal)) {
      chromaFilters.push({ experience: { '$gte': minVal } });
    }
  }

  // Maximum Experience
  if (filters.experienceMax !== undefined && filters.experienceMax !== null && filters.experienceMax !== '') {
    const maxVal = Number(filters.experienceMax);
    if (!isNaN(maxVal)) {
      chromaFilters.push({ experience: { '$lte': maxVal } });
    }
  }

  // Department
  if (filters.department && typeof filters.department === 'string') {
    chromaFilters.push({ department: { '$eq': filters.department } });
  }

  // Designation
  if (filters.designation && typeof filters.designation === 'string') {
    chromaFilters.push({ designation: { '$eq': filters.designation } });
  }

  // Location
  if (filters.location && typeof filters.location === 'string') {
    chromaFilters.push({ location: { '$eq': filters.location } });
  }

  // Availability
  if (filters.availability && typeof filters.availability === 'string') {
    chromaFilters.push({ availability: { '$eq': filters.availability } });
  }

  if (chromaFilters.length === 0) return null;
  if (chromaFilters.length === 1) return chromaFilters[0];
  
  // Combine all conditions using $and logical operator
  return { '$and': chromaFilters };
}

/**
 * Performs a hybrid search: semantic query embedding similarity + ChromaDB metadata filtering.
 */
async function performHybridSearch(query, filters, topK = 5) {
  try {
    const filter = buildChromaFilter(filters);
    if (filter) {
      logger.info(`Applying ChromaDB metadata filters: ${JSON.stringify(filter)}`);
    }
    return await performSemanticSearch(query, topK, filter);
  } catch (err) {
    logger.error('Error occurred during hybrid search execution', err);
    throw err;
  }
}

module.exports = {
  buildChromaFilter,
  performHybridSearch
};
