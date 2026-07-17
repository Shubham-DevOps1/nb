const { parsePdfBuffer } = require('../parsing/pdfParser');
const { extractRequirements } = require('../requirements/requirementExtractor');
const { matchAllRequirements } = require('../requirements/resourceMatcher');
const { runChatTurn } = require('../rag/geminiClient');
const { toolDeclarations, toolExecutors } = require('./tools');
const { getHistory, setHistory } = require('./chatSessionStore');
const logger = require('../utils/logger');

const SYSTEM_INSTRUCTION = 'You are TalentIQ, an internal resource-deployment assistant for a services organization. ' +
  'Your job is to help staffing/delivery managers find and deploy their OWN existing employees onto ' +
  'projects - this is about internal workforce utilization, not external hiring or recruiting. Never ' +
  'use words like "hire", "recruit", or "candidate" to mean an external applicant - the people you ' +
  'discuss are already employees. Use the available tools to look up real employees or uploaded resumes ' +
  'before answering; do not invent names, skills, or numbers. If a tool returns no results, say so ' +
  'plainly rather than guessing. Keep replies concise and cite specifics (names, scores, skills) from ' +
  'the tool output.';

/**
 * Builds a conversational summary of a requirement-document analysis,
 * templated rather than sent through another Gemini call - it's structured
 * data we already trust, so there's no need to pay for an extra round trip
 * just to phrase it in prose.
 */
function summarizeRequirementAnalysis(analysis) {
  const lines = [
    `I read ${analysis.sourceFile} and found ${analysis.requirementCount} resource requirement(s):`,
    ''
  ];
  analysis.matches.forEach((m, i) => {
    const status = m.sufficientResources
      ? `${m.matchedCount} available`
      : `only ${m.matchedCount} found - short of the ${m.count} needed`;
    lines.push(`${i + 1}. **${m.role}** (${m.skills.join(', ')}, ${m.minExperience}+ yrs) - ${status}`);
  });
  lines.push('', 'Ask me for more detail on any role, or ask a direct question like "who has AWS experience?".');
  return lines.join('\n');
}

/**
 * Handles one chat turn. Two paths:
 * - A file attached: run the requirement-matching pipeline directly (this
 *   need doesn't fit a function-calling argument) and summarize the result.
 * - Text only: let Gemini pick between the search/resume-Q&A tools via
 *   function calling, multi-turn, using the session's saved history.
 */
async function handleChatTurn({ sessionId, message, file }) {
  if (file) {
    logger.info(`Chat: analyzing attached requirement document '${file.originalname}' for session ${sessionId}`);
    const { text } = await parsePdfBuffer(file.buffer);
    const requirements = await extractRequirements(text);
    const matches = await matchAllRequirements(requirements);
    const analysis = { sourceFile: file.originalname, requirementCount: requirements.length, matches };
    const reply = summarizeRequirementAnalysis(analysis);

    const history = getHistory(sessionId);
    history.push({ role: 'user', parts: [{ text: message || `[Uploaded requirement document: ${file.originalname}]` }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    setHistory(sessionId, history);

    return { reply, data: analysis, toolUsed: 'requirement_document_analysis' };
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    throw new Error("Message must be a non-empty string when no document is attached.");
  }

  const history = getHistory(sessionId);
  const result = await runChatTurn({
    history,
    message,
    tools: toolDeclarations,
    executors: toolExecutors,
    systemInstruction: SYSTEM_INSTRUCTION
  });

  setHistory(sessionId, result.history);

  const lastTool = result.toolCalls[result.toolCalls.length - 1];
  return {
    reply: result.text,
    data: lastTool ? lastTool.output : null,
    toolUsed: lastTool ? lastTool.name : null
  };
}

module.exports = {
  handleChatTurn
};
