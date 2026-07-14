const { searchResumeChunks } = require('../search/resumeSemanticSearch');
const { generateAnswer } = require('./geminiClient');
const logger = require('../utils/logger');

/**
 * Builds the grounding context handed to Gemini from the retrieved chunks.
 */
function buildPrompt(question, candidates) {
  const context = candidates.map((c, i) => (
    `Candidate ${i + 1} (employeeId: ${c.employeeId}, name: ${c.name}, match score: ${(c.similarityScore * 100).toFixed(0)}%):\n"""${c.bestChunk}"""`
  )).join('\n\n');

  return `You are a talent-acquisition assistant. Answer the recruiter's question using ONLY the resume excerpts below. ` +
    `If the excerpts don't support an answer, say so plainly instead of guessing. Reference candidates by name and give a short reason per candidate you mention.\n\n` +
    `Resume excerpts:\n${context}\n\n` +
    `Recruiter question: ${question}\n\n` +
    `Answer:`;
}

/**
 * Full RAG pipeline: retrieve relevant resume chunks, ground a Gemini prompt
 * with them, and return both the generated answer and the raw match scores.
 */
async function answerQuery(question, topK = 5) {
  if (!question || typeof question !== 'string' || question.trim() === '') {
    throw new Error('Question must be a non-empty string');
  }

  const candidates = await searchResumeChunks(question, topK);

  if (candidates.length === 0) {
    return {
      question,
      candidates: [],
      answer: 'No indexed resumes matched this query yet.'
    };
  }

  const prompt = buildPrompt(question, candidates);
  const answer = await generateAnswer(prompt);

  logger.success(`Generated Gemini RAG answer for question: "${question}"`);

  return {
    question,
    candidates: candidates.map(c => ({
      employeeId: c.employeeId,
      name: c.name,
      matchScore: Number((c.similarityScore * 100).toFixed(2)),
      matchedChunkCount: c.matchedChunkCount
    })),
    answer
  };
}

module.exports = {
  answerQuery
};
