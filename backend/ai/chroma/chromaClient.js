const { ChromaClient } = require('chromadb');
const config = require('../config/chromaConfig');
const logger = require('../utils/logger');

let clientInstance = null;

/**
 * Returns a singleton instance of the ChromaClient.
 */
function getChromaClient() {
  if (clientInstance) return clientInstance;
  
  logger.info(`Connecting to ChromaDB at: ${config.CHROMA_URL}`);
  clientInstance = new ChromaClient({ path: config.CHROMA_URL });
  return clientInstance;
}

module.exports = {
  getChromaClient
};
