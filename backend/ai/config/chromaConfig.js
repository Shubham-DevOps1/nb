module.exports = {
  // Local ChromaDB client endpoint URL
  CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:8000',
  
  // Default target collection name
  COLLECTION_NAME: 'employees',
  
  // Max cosine distance threshold allowed for a search hit (distance <= threshold)
  SEARCH_THRESHOLD: 0.35
};
