const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg, err) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    if (err) console.error(err);
  }
};

module.exports = logger;
