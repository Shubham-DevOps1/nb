const { getChromaClient } = require('./chromaClient');
const resumeConfig = require('../config/resumeConfig');
const logger = require('../utils/logger');

/**
 * Retrieves (or creates) the dedicated collection for resume chunks.
 * Kept separate from the synthetic 'employees' collection since this one
 * stores multiple vectors per employee (one per chunk) instead of one.
 */
async function getResumeCollection() {
  const client = getChromaClient();
  try {
    return await client.getOrCreateCollection({
      name: resumeConfig.RESUME_COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" }
    });
  } catch (err) {
    logger.error(`Failed to retrieve/create collection: ${resumeConfig.RESUME_COLLECTION_NAME}`, err);
    throw err;
  }
}

/**
 * Upserts all chunks for a single resume. Chunk ids are namespaced by
 * employeeId so re-uploading a resume overwrites its previous chunks cleanly.
 */
async function upsertResumeChunks(collection, employeeId, name, chunks, embeddings, extraMetadata = {}) {
  const ids = chunks.map((_, idx) => `${employeeId}::chunk::${idx}`);
  const metadatas = chunks.map((_, idx) => ({
    employeeId,
    name: name || 'Unknown Candidate',
    chunkIndex: idx,
    totalChunks: chunks.length,
    ...extraMetadata
  }));

  try {
    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents: chunks
    });
    logger.success(`Upserted ${chunks.length} chunk(s) for employee: ${employeeId}`);
  } catch (err) {
    logger.error(`Failed to upsert resume chunks for employee: ${employeeId}`, err);
    throw err;
  }
}

/**
 * Deletes all existing chunks for an employee (used before re-indexing a
 * re-uploaded resume that now has a different chunk count).
 */
async function deleteResumeChunks(collection, employeeId) {
  try {
    await collection.delete({ where: { employeeId: { '$eq': employeeId } } });
  } catch (err) {
    logger.warn(`No existing chunks to delete for employee: ${employeeId} (${err.message})`);
  }
}

/**
 * Queries the resume chunk collection with a query embedding.
 */
async function queryResumeChunks(collection, queryEmbedding, topK) {
  try {
    const response = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK
    });
    return response;
  } catch (err) {
    logger.error('Failed to query resume chunk collection', err);
    throw err;
  }
}

module.exports = {
  getResumeCollection,
  upsertResumeChunks,
  deleteResumeChunks,
  queryResumeChunks
};
