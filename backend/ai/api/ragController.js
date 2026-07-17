const { answerQuery } = require('../rag/ragService');
const logger = require('../utils/logger');

/**
 * Handles POST /api/resumes/ask
 * Body: { "question": "Who has AWS Lambda experience?", "topK": 5 }
 */
async function askAboutCandidates(req, res) {
  const { question, topK = 5 } = req.body;

  if (!question || typeof question !== 'string' || question.trim() === '') {
    return res.status(400).json({
      error: "Missing or invalid 'question' field. Must be a non-empty string."
    });
  }

  try {
    const result = await answerQuery(question, topK);
    return res.json(result);
  } catch (err) {
    logger.error(`RAG query failed for question: "${question}"`, err);
    return res.status(500).json({
      error: 'Added Internal Server Error during RAG query.',
      message: err.message
    });
  }
}

module.exports = {
  askAboutCandidates
};
