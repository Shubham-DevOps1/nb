const { getEmbedding } = require('./embeddingService');
const config = require('../config/embeddingConfig');
const logger = require('../utils/logger');

/**
 * Computes embeddings for an array of texts in chunked batches.
 * Processes items within each batch in parallel using Promise.all.
 */
async function getEmbeddingsInBatches(texts, batchSize = config.BATCH_SIZE, showProgress = true) {
  if (!Array.isArray(texts)) {
    throw new Error('Input texts must be an array of strings');
  }

  const embeddings = [];
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    const batchTexts = texts.slice(i, i + batchSize);
    
    try {
      // Process elements in the current batch concurrently
      const batchResults = await Promise.all(
        batchTexts.map(text => getEmbedding(text, false))
      );
      
      embeddings.push(...batchResults);
      
      if (showProgress) {
        const completed = Math.min(total, i + batchTexts.length);
        const percent = Math.round((completed / total) * 100);
        logger.info(`Embedding progress: ${completed}/${total} (${percent}%)`);
      }
    } catch (err) {
      logger.error(`Failed to process batch starting at index ${i}`, err);
      throw err;
    }
  }

  return embeddings;
}

module.exports = {
  getEmbeddingsInBatches
};
