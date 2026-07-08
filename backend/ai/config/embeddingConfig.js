module.exports = {
  // BAAI/bge-base-en-v1.5 model name mapped to Transformers.js format
  MODEL_NAME: 'Xenova/bge-base-en-v1.5',
  
  // Prefix required by BGE query-retrieval modeling
  QUERY_PREFIX: 'Represent this sentence for searching relevant passages: ',
  
  // Chunks for parallelized batch embedding execution
  BATCH_SIZE: 16,
  
  // Vector dimensions size
  DIMENSION: 768
};
