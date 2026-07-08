const { getEmbedding } = require('../embeddings/embeddingService');
const { getCollection, queryCollection } = require('../chroma/employeeCollection');
const logger = require('../utils/logger');
const chromaConfig = require('../config/chromaConfig');

/**
 * Performs semantic search on the ChromaDB collection.
 * Returns array of matches.
 */
async function performSemanticSearch(query, topK = 5, filter = null) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('Query string must be a non-empty string');
  }

  try {
    // 1. Generate query vector with BGE prefix
    const queryEmbedding = await getEmbedding(query, true);

    // 2. Fetch collection instance
    const collection = await getCollection();

    // 3. Query collection
    const rawResults = await queryCollection(collection, queryEmbedding, topK, filter);

    // 4. Format and normalize results
    const matches = [];
    if (rawResults && rawResults.ids && rawResults.ids[0]) {
      const ids = rawResults.ids[0];
      const distances = rawResults.distances[0];
      const metadatas = rawResults.metadatas[0];
      const documents = rawResults.documents[0];

      for (let i = 0; i < ids.length; i++) {
        // Cosine distance = 1 - Cosine Similarity
        // Cosine similarity ranges from -1 to 1 (or 0 to 1 for normalized vectors)
        const distance = distances[i];
        const similarity = Math.max(0, 1 - distance);

        matches.push({
          employeeId: ids[i],
          name: metadatas[i].name || 'Unknown',
          document: documents[i],
          distance: distance,
          similarityScore: similarity,
          metadata: metadatas[i]
        });
      }
    }

    return matches;
  } catch (err) {
    logger.error(`Error occurred during semantic search query: "${query}"`, err);
    throw err;
  }
}

// Support CLI execution: npm run search "query" [topK]
async function cliRun() {
  const args = process.argv.slice(2);
  const query = args[0];
  const topK = args[1] ? parseInt(args[1], 10) : 5;

  if (!query) {
    console.log('\nUsage: npm run search "<search_query>" [top_k]');
    console.log('Example: npm run search "Backend Engineer with AWS Lambda" 3\n');
    process.exit(0);
  }

  logger.info(`Running CLI Semantic Search for: "${query}" (topK: ${topK})`);
  try {
    const results = await performSemanticSearch(query, topK);
    console.log(`\n================ SEARCH RESULTS (${results.length} found) ================`);
    results.forEach((match, i) => {
      console.log(`\n[${i + 1}] Employee Name: ${match.name} (ID: ${match.employeeId})`);
      console.log(`    Semantic Similarity : ${(match.similarityScore * 100).toFixed(2)}% (Distance: ${match.distance.toFixed(4)})`);
      console.log(`    Designation         : ${match.metadata.designation} (${match.metadata.department})`);
      console.log(`    Location            : ${match.metadata.location}`);
      console.log(`    Availability        : ${match.metadata.availability}`);
      console.log(`    Skills              : ${match.metadata.primarySkills}`);
      console.log(`    Summary Preview     : ${match.document.substring(0, 150)}...`);
    });
    console.log('==========================================================\n');
  } catch (err) {
    logger.error('CLI search execution failed.', err);
  }
}

if (require.main === module) {
  cliRun();
}

module.exports = {
  performSemanticSearch
};
