const crypto = require('crypto');

/**
 * In-memory conversation history store, keyed by session id. Deliberately
 * simple (no persistence, no TTL/eviction) - this is a single-process demo
 * app; sessions reset on server restart, which is an acceptable trade-off
 * for now over adding a real datastore for chat history.
 */
const sessions = new Map();

function createSessionId() {
  return crypto.randomUUID();
}

function getHistory(sessionId) {
  return sessions.get(sessionId) || [];
}

function setHistory(sessionId, history) {
  sessions.set(sessionId, history);
}

module.exports = {
  createSessionId,
  getHistory,
  setHistory
};
