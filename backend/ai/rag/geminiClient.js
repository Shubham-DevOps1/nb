const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/geminiConfig');
const logger = require('../utils/logger');

const client = () => new GoogleGenerativeAI(config.API_KEY);

let candidateModelsPromise = null;
let workingModelName = null;
const failedModels = new Set();

/**
 * Asks Google's own ListModels endpoint which models this API key can call
 * generateContent on. Gemini model availability shifts over time (models get
 * deprecated or closed off to new projects while still appearing in this
 * list), so we fetch the full ranked candidate list once and let
 * generateAnswer() try each one until it finds one this key can actually use.
 */
async function listCandidateModels() {
  const url = `https://generativelanguage.googleapis.com/${config.API_VERSION}/models?key=${config.API_KEY}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(config.REQUEST_TIMEOUT_MS) });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(`ListModels request timed out after ${config.REQUEST_TIMEOUT_MS}ms - this machine likely can't reach generativelanguage.googleapis.com directly (corporate proxy/firewall?).`);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ListModels request failed (${res.status}): ${body}`);
  }

  const { models = [] } = await res.json();
  const usable = models
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''));

  if (usable.length === 0) {
    throw new Error('Your Gemini API key has no models available that support generateContent.');
  }

  // Prefer newer generations, and 'flash' over 'pro' within a generation (cheaper/faster).
  usable.sort((a, b) => {
    const versionOf = (name) => parseFloat((name.match(/gemini-(\d+(\.\d+)?)/) || [])[1] || '0');
    const versionDiff = versionOf(b) - versionOf(a);
    if (versionDiff !== 0) return versionDiff;
    return (/flash/i.test(a) ? 0 : 1) - (/flash/i.test(b) ? 0 : 1);
  });

  return usable;
}

async function getCandidateModels() {
  if (!candidateModelsPromise) {
    candidateModelsPromise = listCandidateModels().catch(err => {
      candidateModelsPromise = null; // allow retrying after a transient ListModels failure
      throw err;
    });
  }
  return candidateModelsPromise;
}

/**
 * Sends a prompt to Gemini, trying candidate models in preference order and
 * skipping any already known not to work for this key, until one succeeds.
 */
async function generateAnswer(prompt, extraGenerationConfig = {}) {
  if (!config.API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Export it before calling the RAG endpoint.');
  }

  const candidates = config.MODEL_NAME ? [config.MODEL_NAME] : await getCandidateModels();
  const generationConfig = {
    temperature: config.TEMPERATURE,
    maxOutputTokens: config.MAX_OUTPUT_TOKENS,
    ...extraGenerationConfig
  };
  const requestOptions = { timeout: config.REQUEST_TIMEOUT_MS };

  // Try the last known-working model first so steady-state calls don't re-probe every time.
  const orderedCandidates = workingModelName
    ? [workingModelName, ...candidates.filter(m => m !== workingModelName)]
    : candidates;

  let lastErr = null;
  for (const modelName of orderedCandidates) {
    if (failedModels.has(modelName)) continue;

    try {
      const model = client().getGenerativeModel({ model: modelName, generationConfig }, requestOptions);
      const result = await model.generateContent(prompt);
      workingModelName = modelName;
      return result.response.text();
    } catch (err) {
      logger.warn(`Model '${modelName}' failed (${err.message.substring(0, 120)}), trying next candidate...`);
      failedModels.add(modelName);
      lastErr = err;
    }
  }

  logger.error('All candidate Gemini models failed for this API key', lastErr);
  throw lastErr || new Error('No usable Gemini model found for this API key.');
}

/**
 * Runs one turn of a tool-using chat: sends the message with the given
 * history, executes any function calls the model makes via the provided
 * executor map, feeds the results back, and returns the final natural-
 * language reply plus the updated history.
 *
 * Reuses the same candidate-model fallback as generateAnswer, since function
 * calling isn't universally supported the same way across every model a key
 * can access.
 */
async function runChatTurn({ history = [], message, tools, executors, systemInstruction }) {
  if (!config.API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Export it before calling the chat endpoint.');
  }

  const candidates = config.MODEL_NAME ? [config.MODEL_NAME] : await getCandidateModels();
  const generationConfig = { temperature: config.TEMPERATURE, maxOutputTokens: config.MAX_OUTPUT_TOKENS };
  const requestOptions = { timeout: config.REQUEST_TIMEOUT_MS };

  const orderedCandidates = workingModelName
    ? [workingModelName, ...candidates.filter(m => m !== workingModelName)]
    : candidates;

  let lastErr = null;
  for (const modelName of orderedCandidates) {
    if (failedModels.has(modelName)) continue;

    try {
      const model = client().getGenerativeModel({ model: modelName, generationConfig, tools, systemInstruction }, requestOptions);
      const chat = model.startChat({ history });

      let result = await chat.sendMessage(message);
      let calls = result.response.functionCalls();

      // Models can request more than one tool call, and can even chain a
      // second round of calls after seeing the first results - loop until it
      // stops asking for tools, with a hard cap so a confused model can't
      // spin forever.
      let toolCallLog = [];
      let rounds = 0;
      while (calls && calls.length > 0 && rounds < 4) {
        const responseParts = [];
        for (const call of calls) {
          const executor = executors[call.name];
          const output = executor
            ? await executor(call.args || {})
            : { error: `Unknown tool: ${call.name}` };
          toolCallLog.push({ name: call.name, args: call.args, output });
          responseParts.push({ functionResponse: { name: call.name, response: output } });
        }
        result = await chat.sendMessage(responseParts);
        calls = result.response.functionCalls();
        rounds++;
      }

      workingModelName = modelName;
      return {
        text: result.response.text(),
        history: await chat.getHistory(),
        toolCalls: toolCallLog
      };
    } catch (err) {
      logger.warn(`Model '${modelName}' failed in chat mode (${err.message.substring(0, 120)}), trying next candidate...`);
      failedModels.add(modelName);
      lastErr = err;
    }
  }

  logger.error('All candidate Gemini models failed for this API key (chat mode)', lastErr);
  throw lastErr || new Error('No usable Gemini model found for this API key.');
}

module.exports = {
  generateAnswer,
  runChatTurn
};
