const { getEmbedding } = require('../embeddings/embeddingService');
const { getResumeCollection, queryResumeChunks } = require('../chroma/resumeChunkCollection');
const resumeConfig = require('../config/resumeConfig');
const logger = require('../utils/logger');

/**
 * Performs semantic search over resume chunks and aggregates hits back to
 * one result per employee, since each employee has many chunk vectors.
 * An employee's score is the score of their single best-matching chunk.
 */
async function searchResumeChunks(query, topK = 5) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('Query string must be a non-empty string');
  }

  const queryEmbedding = await getEmbedding(query, true);
  const collection = await getResumeCollection();

  // Pull more chunk hits than topK since several chunks can belong to the
  // same employee and would otherwise crowd out other candidates.
  const rawResults = await queryResumeChunks(
    collection,
    queryEmbedding,
    topK * resumeConfig.CHUNK_RETRIEVAL_MULTIPLIER
  );

  const byEmployee = new Map();

  if (rawResults && rawResults.ids && rawResults.ids[0]) {
    const ids = rawResults.ids[0];
    const distances = rawResults.distances[0];
    const metadatas = rawResults.metadatas[0];
    const documents = rawResults.documents[0];

    for (let i = 0; i < ids.length; i++) {
      const similarity = Math.max(0, 1 - distances[i]);
      const meta = metadatas[i];
      const employeeId = meta.employeeId;

      const existing = byEmployee.get(employeeId);
      if (!existing || similarity > existing.similarityScore) {
        byEmployee.set(employeeId, {
          employeeId,
          name: meta.name || 'Unknown',
          bestChunk: documents[i],
          chunkIndex: meta.chunkIndex,
          similarityScore: similarity,
          distance: distances[i],
          matchedChunkCount: (existing ? existing.matchedChunkCount : 0) + 1
        });
      } else {
        existing.matchedChunkCount += 1;
      }
    }
  }

  const results = Array.from(byEmployee.values())
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topK);

  logger.info(`Resume chunk search for "${query}" resolved to ${results.length} candidate(s) from chunk hits.`);
  return results;
}

module.exports = {
  searchResumeChunks
};
