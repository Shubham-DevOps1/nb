const logger = require('../utils/logger');

/**
 * Validates a knowledge card record.
 * Returns true if valid, false otherwise.
 */
function validateKnowledgeCard(record, index) {
  if (!record || typeof record !== 'object') {
    logger.warn(`Record at index ${index} is null or not an object.`);
    return false;
  }

  const { employeeId, name, knowledgeCard } = record;

  if (!employeeId || typeof employeeId !== 'string' || employeeId.trim() === '') {
    logger.warn(`Record at index ${index} has missing or invalid 'employeeId'.`);
    return false;
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    logger.warn(`Employee (ID: ${employeeId}) has missing or invalid 'name'.`);
    return false;
  }

  if (!knowledgeCard || typeof knowledgeCard !== 'string' || knowledgeCard.trim() === '') {
    logger.warn(`Employee (ID: ${employeeId}, Name: ${name}) has an empty 'knowledgeCard'.`);
    return false;
  }

  if (knowledgeCard.length < 50) {
    logger.warn(`Employee (ID: ${employeeId}, Name: ${name}) has a suspiciously short knowledge card (${knowledgeCard.length} chars).`);
    return false;
  }

  return true;
}

/**
 * Validates a list of knowledge card records.
 * Returns an array of valid records.
 */
function validateRecords(records) {
  if (!Array.isArray(records)) {
    logger.error('Input records must be an array');
    return [];
  }

  const validRecords = [];
  const seenIds = new Set();

  records.forEach((record, index) => {
    if (validateKnowledgeCard(record, index)) {
      if (seenIds.has(record.employeeId)) {
        logger.warn(`Duplicate Employee ID detected during validation: ${record.employeeId}. Skipping copy...`);
        return;
      }
      seenIds.add(record.employeeId);
      validRecords.push(record);
    }
  });

  return validRecords;
}

module.exports = {
  validateKnowledgeCard,
  validateRecords
};
