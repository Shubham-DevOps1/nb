const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Finds and loads a JSON file from multiple possible directories.
 */
function loadJsonFile(fileName) {
  const possiblePaths = [
    // 1. Relative to process cwd (project root)
    path.join(process.cwd(), 'output', 'json', fileName),
    path.join(process.cwd(), 'backend', 'generator', 'output', fileName),
    path.join(process.cwd(), 'generator', 'output', fileName),
    // 2. Relative to process cwd (directly output folder)
    path.join(process.cwd(), 'output', fileName),
    // 3. Relative to this module's directory
    path.join(__dirname, '..', '..', 'generator', 'output', fileName),
    path.join(__dirname, '..', 'output', fileName)
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readJsonSync(filePath);
        logger.info(`Successfully loaded '${fileName}' from: ${filePath}`);
        return data;
      } catch (err) {
        logger.error(`Found file at ${filePath} but failed to parse JSON`, err);
      }
    }
  }

  throw new Error(`Failed to load JSON file '${fileName}'. Searched paths: \n${possiblePaths.join('\n')}`);
}

module.exports = {
  loadJsonFile
};
