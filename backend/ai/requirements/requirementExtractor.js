const skillsMaster = require('../../generator/master/skills');
const domainsMaster = require('../../generator/master/domains');
const { generateAnswer } = require('../rag/geminiClient');
const logger = require('../utils/logger');

/**
 * Strips markdown code fences Gemini sometimes wraps JSON in, despite being
 * asked for raw JSON, and trims to the outermost [...] in case the model
 * added stray prose before/after the array.
 */
function stripCodeFences(text) {
  const noFences = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = noFences.indexOf('[');
  const end = noFences.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return noFences;
  return noFences.slice(start, end + 1);
}

/**
 * Builds the extraction prompt. Grounds the model in the actual skill/domain
 * vocabulary our resource pool is tagged with, so it names requirements using
 * terms that can later be matched against employee metadata - a project spec
 * rarely states "we need 2 Node.js developers" outright, so the model has to
 * infer roles/skills from functional and non-functional requirements instead.
 */
function buildExtractionPrompt(documentText) {
  const skillLines = Object.entries(skillsMaster)
    .map(([category, skills]) => `- ${category}: ${skills.join(', ')}`)
    .join('\n');
  const domainLines = domainsMaster.join(', ');

  return `You are a technical staffing analyst. Read the project requirement document below ` +
    `(it may be a full SRS with functional/non-functional requirements, not an explicit staffing list) ` +
    `and infer the technical resource requirements needed to build it.\n\n` +
    `Use ONLY skill names from this vocabulary (pick the closest matches - do not invent new skill names):\n${skillLines}\n\n` +
    `Use ONLY a domain name from this list if one clearly applies (omit domain if none fit):\n${domainLines}\n\n` +
    `For each distinct type of resource needed, estimate a role title, the relevant skills (2-4 from the ` +
    `vocabulary above), a minimum years of experience, and a headcount estimate - base the headcount and ` +
    `experience level on the apparent scope/complexity of the related requirements (e.g. non-functional ` +
    `requirements like scale, security, or uptime targets imply more senior/more resources).\n\n` +
    `Respond with ONLY a raw JSON array (no markdown, no commentary), each element shaped exactly as:\n` +
    `{"role": string, "skills": string[], "domain": string|null, "minExperience": number, "count": number, "justification": string}\n\n` +
    `Project requirement document:\n"""${documentText}"""`;
}

/**
 * Validates and coerces one extracted requirement entry. Returns null if the
 * entry is unusable (missing the fields we need to actually match resources).
 */
function sanitizeRequirement(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.role || typeof entry.role !== 'string') return null;
  if (!Array.isArray(entry.skills) || entry.skills.length === 0) return null;

  const skills = entry.skills.filter(s => typeof s === 'string' && s.trim() !== '');
  if (skills.length === 0) return null;

  return {
    role: entry.role.trim(),
    skills,
    domain: typeof entry.domain === 'string' && entry.domain.trim() !== '' ? entry.domain.trim() : null,
    minExperience: Number.isFinite(Number(entry.minExperience)) ? Math.max(0, Number(entry.minExperience)) : 0,
    count: Number.isFinite(Number(entry.count)) && Number(entry.count) > 0 ? Math.round(Number(entry.count)) : 1,
    justification: typeof entry.justification === 'string' ? entry.justification : ''
  };
}

/**
 * Extracts a structured list of staffing requirements from raw project
 * requirement document text, grounded in the actual skills/domains taxonomy.
 */
async function extractRequirements(documentText) {
  if (!documentText || typeof documentText !== 'string' || documentText.trim() === '') {
    throw new Error('Document text must be a non-empty string');
  }

  const prompt = buildExtractionPrompt(documentText);

  // Force Gemini's native JSON mode rather than relying on prompt wording -
  // this is what actually stopped the model from prefacing/wrapping the
  // array with prose despite explicit instructions not to. Also raise the
  // output budget above the RAG-answer default (1024), since a multi-line
  // JSON array with per-requirement justifications is longer than a
  // conversational answer and was silently truncating on bigger documents.
  //
  // thinkingBudget: 0 disables the model's hidden reasoning tokens. On a
  // longer/more complex document, a "thinking" model burned ~1,900 of the
  // 2048-token budget on invisible reasoning before writing a single
  // character of the actual JSON, so the visible output got cut off
  // mid-string (finishReason: MAX_TOKENS) despite the raised ceiling above.
  // This step doesn't need step-by-step reasoning - it's a grounded
  // extraction against a fixed vocabulary - so trading that away for
  // reliability is the right call here.
  const generationConfig = {
    responseMimeType: 'application/json',
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingBudget: 0 }
  };

  // Even in JSON mode, a rare malformed/truncated response is still possible -
  // one retry clears that without masking a persistently broken prompt/model.
  let parsed;
  let lastParseErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const rawResponse = await generateAnswer(prompt, generationConfig);
    try {
      parsed = JSON.parse(stripCodeFences(rawResponse));
      lastParseErr = null;
      break;
    } catch (err) {
      lastParseErr = err;
      logger.warn(`Gemini requirement-extraction response was not valid JSON (attempt ${attempt}/2): ${err.message}`);
    }
  }

  if (lastParseErr) {
    logger.error('Failed to parse Gemini requirement-extraction response as JSON after retry', lastParseErr);
    throw new Error(`Gemini did not return valid JSON for requirement extraction: ${lastParseErr.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini requirement-extraction response was valid JSON but not an array');
  }

  const requirements = parsed.map(sanitizeRequirement).filter(Boolean);

  if (requirements.length === 0) {
    throw new Error('No usable requirements could be extracted from this document');
  }

  logger.success(`Extracted ${requirements.length} resource requirement(s) from document`);
  return requirements;
}

module.exports = {
  extractRequirements,
  buildExtractionPrompt,
  sanitizeRequirement
};
