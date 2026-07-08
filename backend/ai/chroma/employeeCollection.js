const { getChromaClient } = require('./chromaClient');
const config = require('../config/chromaConfig');
const logger = require('../utils/logger');

/**
 * Retrieves the employees collection instance, creating it if it does not exist.
 * Configured to use Cosine Similarity for distance metrics.
 */
async function getCollection() {
  const client = getChromaClient();
  try {
    // We enforce cosine similarity by setting hnsw:space to 'cosine'
    const collection = await client.getOrCreateCollection({
      name: config.COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" }
    });
    return collection;
  } catch (err) {
    logger.error(`Failed to retrieve/create collection: ${config.COLLECTION_NAME}`, err);
    throw err;
  }
}

/**
 * Resets (deletes) the collection to ensure a clean state if required.
 */
async function resetCollection() {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: config.COLLECTION_NAME });
    logger.info(`Deleted existing collection: ${config.COLLECTION_NAME}`);
  } catch (err) {
    // If it doesn't exist, ignore the error
    logger.info(`Collection '${config.COLLECTION_NAME}' did not exist during reset. Proceeding...`);
  }
}

/**
 * Adds or upserts records into the collection.
 */
async function upsertEmployeeBatch(collection, ids, embeddings, metadatas, documents) {
  try {
    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents
    });
  } catch (err) {
    logger.error('Failed to upsert employee batch into ChromaDB', err);
    throw err;
  }
}

/**
 * Retrieves total document count in the collection.
 */
async function getCollectionCount(collection) {
  try {
    return await collection.count();
  } catch (err) {
    logger.error('Failed to get collection count', err);
    throw err;
  }
}

/**
 * Queries the collection using a vector and optional metadata filters.
 */
async function queryCollection(collection, queryEmbedding, topK = 5, filter = null) {
  try {
    const queryParams = {
      queryEmbeddings: [queryEmbedding],
      nResults: topK
    };

    if (filter && Object.keys(filter).length > 0) {
      queryParams.where = filter;
    }

    const response = await collection.query(queryParams);
    return response;
  } catch (err) {
    logger.error('Failed to query ChromaDB collection', err);
    throw err;
  }
}

module.exports = {
  getCollection,
  resetCollection,
  upsertEmployeeBatch,
  getCollectionCount,
  queryCollection
};
