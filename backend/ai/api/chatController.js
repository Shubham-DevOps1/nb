const { handleChatTurn } = require('../chat/chatOrchestrator');
const { createSessionId } = require('../chat/chatSessionStore');
const logger = require('../utils/logger');

/**
 * Handles POST /api/chat
 * Multipart form fields: sessionId (optional - a new one is created and
 * returned if omitted), message (text, required unless a document is
 * attached), document (optional PDF - a client requirement doc).
 */
async function chat(req, res) {
  const sessionId = req.body.sessionId || createSessionId();
  const message = req.body.message;
  const file = req.file;

  if (!file && (!message || typeof message !== 'string' || message.trim() === '')) {
    return res.status(400).json({
      error: "Missing input. Provide a 'message' field, a 'document' file, or both.",
      sessionId
    });
  }

  try {
    const { reply, data, toolUsed } = await handleChatTurn({ sessionId, message, file });
    return res.status(200).json({ sessionId, reply, toolUsed, data });
  } catch (err) {
    logger.error(`Chat turn failed for session ${sessionId}`, err);
    return res.status(500).json({
      error: 'Internal Server Error during chat turn.',
      message: err.message,
      sessionId
    });
  }
}

module.exports = {
  chat
};
