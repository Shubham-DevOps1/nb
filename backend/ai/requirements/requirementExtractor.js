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
    `For each distinct type of resource needed, estimate a role title, the relevant skills (3-8 from the ` +
    `vocabulary above - list every skill genuinely implied by the document's functional AND non-functional ` +
    `requirements for that role, not just the most obvious ones; e.g. a security requirement like encryption, ` +
    `RBAC, or audit logging should surface a relevant security skill even if the role's core function is ` +
    `something else), a minimum years of experience, and a headcount estimate - base the headcount and ` +
    `experience level on the apparent scope/complexity of the related requirements (e.g. non-functional ` +
    `requirements like scale, security, or uptime targets imply more senior/more resources).\n\n` +
    `For each skill, also judge how central it is to this specific role's requirements: "Must have" (the ` +
    `role cannot function without it), "Important" (heavily used but not the sole blocker), or "Nice to have" ` +
    `(mentioned or implied but peripheral) - plus a relevance score 0-100 reflecting how directly the document ` +
    `emphasizes it (e.g. a skill tied to an explicit non-functional requirement like uptime/security scores ` +
    `higher than one only implied by a generic module description).\n\n` +
    `Also list any professional certifications the document explicitly requires or names (e.g. "AWS Certified ` +
    `Solutions Architect", "PCI-DSS"). Only include ones actually mentioned or clearly implied by named ` +
    `compliance/security standards in the text - leave the array empty rather than inventing plausible-sounding ` +
    `certifications no document reference supports.\n\n` +
    `Respond with ONLY a raw JSON array (no markdown, no commentary), each element shaped exactly as:\n` +
    `{"role": string, "skills": string[], "skillDetails": {"name": string, "importance": "Must have"|"Important"|"Nice to have", "relevance": number}[], "certifications": string[], "domain": string|null, "minExperience": number, "count": number, "justification": string}\n\n` +
    `"skills" must list the same skill names as "skillDetails" (skills is kept for matching, skillDetails ` +
    `carries the importance/relevance metadata for display) - do not let them diverge.\n\n` +
    `Project requirement document:\n"""${documentText}"""`;
}

/**
 * Validates and coerces one extracted requirement entry. Returns null if the
 * entry is unusable (missing the fields we need to actually match resources).
 */
const VALID_IMPORTANCE = new Set(['Must have', 'Important', 'Nice to have']);

/**
 * Validates the model's per-skill importance/relevance metadata. Falls back
 * to a neutral "Important"/70 default per skill if the model omitted
 * skillDetails or produced a malformed/divergent entry, rather than
 * dropping the skill or failing the whole extraction over decorative data.
 */
function sanitizeSkillDetails(rawDetails, skills) {
  const byName = new Map();
  if (Array.isArray(rawDetails)) {
    for (const d of rawDetails) {
      if (d && typeof d.name === 'string') byName.set(d.name.trim(), d);
    }
  }

  return skills.map(name => {
    const detail = byName.get(name);
    const importance = detail && VALID_IMPORTANCE.has(detail.importance) ? detail.importance : 'Important';
    const relevanceNum = Number(detail?.relevance);
    const relevance = Number.isFinite(relevanceNum) ? Math.min(100, Math.max(0, Math.round(relevanceNum))) : 70;
    return { name, importance, relevance };
  });
}

function sanitizeRequirement(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.role || typeof entry.role !== 'string') return null;
  if (!Array.isArray(entry.skills) || entry.skills.length === 0) return null;

  const skills = entry.skills.filter(s => typeof s === 'string' && s.trim() !== '');
  if (skills.length === 0) return null;

  const certifications = Array.isArray(entry.certifications)
    ? entry.certifications.filter(c => typeof c === 'string' && c.trim() !== '')
    : [];

  return {
    role: entry.role.trim(),
    skills,
    skillDetails: sanitizeSkillDetails(entry.skillDetails, skills),
    certifications,
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
    // Bumped from 3072 - raising the per-role skill cap from 2-4 to 3-8
    // (every role was hitting the old cap's ceiling, cutting off skills a
    // richer document genuinely implied) roughly doubles skillDetails
    // entries per requirement again.
    maxOutputTokens: 4096,
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
