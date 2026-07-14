const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/resumeConfig');
const logger = require('../utils/logger');

fs.ensureDirSync(config.EMPLOYEE_STORE_DIR);
fs.ensureDirSync(config.UPLOAD_DIR);

function recordPath(employeeId) {
  return path.join(config.EMPLOYEE_STORE_DIR, `${employeeId}.json`);
}

/**
 * Persists a parsed resume as a JSON record keyed by employeeId.
 * Generates a new employeeId if one isn't supplied (fresh resume upload).
 */
function saveEmployeeRecord({ employeeId, name, resumeText, sourceFile, numPages }) {
  const id = employeeId || `RESUME-${crypto.randomUUID()}`;

  const record = {
    employeeId: id,
    name: name || 'Unknown Candidate',
    resumeText,
    sourceFile,
    numPages: numPages || null,
    uploadedAt: new Date().toISOString()
  };

  try {
    fs.writeJsonSync(recordPath(id), record, { spaces: 2 });
    logger.success(`Saved employee resume record: ${id}`);
    return record;
  } catch (err) {
    logger.error(`Failed to persist employee record for ID: ${id}`, err);
    throw err;
  }
}

function getEmployeeRecord(employeeId) {
  const filePath = recordPath(employeeId);
  if (!fs.existsSync(filePath)) return null;
  return fs.readJsonSync(filePath);
}

function listEmployeeRecords() {
  const files = fs.readdirSync(config.EMPLOYEE_STORE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => fs.readJsonSync(path.join(config.EMPLOYEE_STORE_DIR, f)));
}

module.exports = {
  saveEmployeeRecord,
  getEmployeeRecord,
  listEmployeeRecords
};
