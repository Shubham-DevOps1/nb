const { pipeline } = require('@huggingface/transformers');
const config = require('../config/embeddingConfig');
const logger = require('../utils/logger');

let extractorInstance = null;
let loadingPromise = null;

/**
 * Initializes and returns the feature extraction pipeline instance.
 * Automatically caches the model files locally.
 * Concurrent callers share one in-flight load (via loadingPromise) instead of
 * each starting their own pipeline() call, which caused simultaneous reads of
 * the same ONNX model file to fail with a file-lock error on Windows.
 */
async function getExtractor() {
  if (extractorInstance) return extractorInstance;
  if (loadingPromise) return loadingPromise;

  logger.info(`Loading embedding model '${config.MODEL_NAME}'...`);
  loadingPromise = pipeline('feature-extraction', config.MODEL_NAME)
    .then(extractor => {
      extractorInstance = extractor;
      logger.success('Embedding model loaded successfully!');
      return extractorInstance;
    })
    .catch(err => {
      logger.error(`Failed to load embedding model: ${config.MODEL_NAME}`, err);
      loadingPromise = null;
      throw err;
    });

  return loadingPromise;
}

/**
 * Generates a normalized 768-dimension embedding vector for a given text.
 */
async function getEmbedding(text, isQuery = false) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  const extractor = await getExtractor();
  
  // For queries, BGE recommends prefixing search queries
  const formattedText = isQuery ? `${config.QUERY_PREFIX}${text}` : text;
  
  try {
    const output = await extractor(formattedText, {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert Float32Array to a standard JavaScript Array
    return Array.from(output.data);
  } catch (err) {
    logger.error(`Failed to compute embedding for text: "${text.substring(0, 50)}..."`, err);
    throw err;
  }
}

module.exports = {
  getExtractor,
  getEmbedding
};
