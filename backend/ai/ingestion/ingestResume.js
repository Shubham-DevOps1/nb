const { parsePdfBuffer } = require('../parsing/pdfParser');
const { saveEmployeeRecord } = require('../storage/employeeResumeStore');
const { chunkText } = require('../chunking/textChunker');
const { getEmbeddingsInBatches } = require('../embeddings/batchEmbeddingService');
const { getResumeCollection, deleteResumeChunks, upsertResumeChunks } = require('../chroma/resumeChunkCollection');
const { startTimer } = require('../utils/timer');
const logger = require('../utils/logger');

/**
 * Runs the full resume ingestion pipeline for a single uploaded PDF:
 * parse -> store -> chunk -> embed -> index in ChromaDB.
 */
async function ingestResume({ buffer, originalFilename, employeeId, name }) {
  const timer = startTimer();

  // Phase 2: PDF Parsing
  const { text, numPages } = await parsePdfBuffer(buffer);

  // Phase 3: Employee JSON Storage
  const record = saveEmployeeRecord({
    employeeId,
    name,
    resumeText: text,
    sourceFile: originalFilename,
    numPages
  });

  // Phase 4: Chunking
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error('Resume produced zero chunks after parsing - file may be empty or unreadable');
  }

  // Phase 5: Embeddings
  const embeddings = await getEmbeddingsInBatches(chunks);

  // Phase 6: ChromaDB indexing
  const collection = await getResumeCollection();
  await deleteResumeChunks(collection, record.employeeId);
  await upsertResumeChunks(collection, record.employeeId, record.name, chunks, embeddings, {
    sourceFile: originalFilename
  });

  const elapsedMs = timer.stop();
  logger.success(`Ingested resume for ${record.employeeId} (${chunks.length} chunks) in ${elapsedMs.toFixed(0)}ms`);

  return {
    employeeId: record.employeeId,
    name: record.name,
    numPages,
    chunkCount: chunks.length,
    elapsedMs
  };
}

module.exports = {
  ingestResume
};
