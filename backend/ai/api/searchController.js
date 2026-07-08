const { performHybridSearch } = require('../search/hybridSearch');
const { rankCandidates } = require('../search/rankingEngine');
const logger = require('../utils/logger');

/**
 * Handles Express POST search requests.
 * Request Body:
 * {
 *   "query": "Need Backend Engineer with AWS Lambda",
 *   "topK": 5,
 *   "filters": {
 *      "experienceMin": 5,
 *      "department": "Core Product Engineering",
 *      "location": "Seattle, WA, USA",
 *      "availability": "Available"
 *   }
 * }
 */
async function searchEmployees(req, res) {
  const { query, topK = 5, filters = {} } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      error: "Missing or invalid query parameter. Field 'query' must be a non-empty string."
    });
  }

  logger.info(`Received API Search Request: "${query}" (topK: ${topK})`);
  
  try {
    // 1. Perform Hybrid Vector Search (including metadata filtering)
    const matches = await performHybridSearch(query, filters, topK * 2); // Retrieve slightly more to allow ranking filtration

    if (matches.length === 0) {
      return res.json({
        query,
        results: []
      });
    }

    // 2. Perform Business Ranking
    const rankedResults = rankCandidates(matches, query);
    
    // 3. Slice to desired topK limit
    const finalResults = rankedResults.slice(0, topK);

    return res.json({
      query,
      results: finalResults
    });
  } catch (err) {
    logger.error(`API Search Controller failed for query: "${query}"`, err);
    return res.status(500).json({
      error: "Internal Server Error during search processing.",
      message: err.message
    });
  }
}

module.exports = {
  searchEmployees
};
