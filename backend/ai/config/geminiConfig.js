module.exports = {
  API_KEY: process.env.GEMINI_API_KEY || '',
  // Leave unset to auto-discover a model your key can actually call - Gemini
  // model availability changes over time and hardcoding one risks 404s as
  // older models get deprecated. Set GEMINI_MODEL to pin a specific one.
  MODEL_NAME: process.env.GEMINI_MODEL || null,
  API_VERSION: 'v1beta',
  TEMPERATURE: 0.2,
  MAX_OUTPUT_TOKENS: 1024,
  // Fail fast instead of hanging forever if this network can't reach Google's API
  // (common behind corporate proxies/firewalls).
  REQUEST_TIMEOUT_MS: 15000
};
