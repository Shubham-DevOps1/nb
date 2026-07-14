const config = require('../config/resumeConfig');
const logger = require('../utils/logger');

/**
 * Splits text into sentences, keeping the terminating punctuation.
 */
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Chunks resume text into overlapping, sentence-aligned windows.
 * Sentence alignment avoids cutting a skill/date/company mid-word, which
 * would otherwise degrade the embedding for that chunk.
 */
function chunkText(text, chunkSize = config.CHUNK_SIZE, overlap = config.CHUNK_OVERLAP) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  const sentences = splitIntoSentences(text);
  const chunks = [];

  let current = '';
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length > chunkSize && current) {
      chunks.push(current.trim());

      // Carry the tail of the previous chunk forward so retrieval doesn't
      // lose context that straddles a chunk boundary.
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = `${tail} ${sentence}`.trim();
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  logger.info(`Chunked text (${text.length} chars) into ${chunks.length} chunk(s).`);
  return chunks;
}

module.exports = {
  splitIntoSentences,
  chunkText
};
