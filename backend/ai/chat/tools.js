const { SchemaType } = require('@google/generative-ai');
const { performHybridSearch } = require('../search/hybridSearch');
const { rankCandidates } = require('../search/rankingEngine');
const { answerQuery } = require('../rag/ragService');

/**
 * Tool schemas the chat model can choose to call. Kept to the two
 * text-only capabilities - requirement-document matching needs a file
 * upload, which doesn't fit a function-calling argument, so that path is
 * handled separately in chatOrchestrator when a file is attached.
 */
const toolDeclarations = [
  {
    functionDeclarations: [
      {
        name: 'search_employees',
        description: 'Search the employee workforce by skills, role, experience, or availability using semantic search. Use this when the user is asking to find or recommend staff/resources for a need, without referencing an uploaded document.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: 'Natural-language description of the resource needed, e.g. "backend developer with AWS Lambda experience"' },
            topK: { type: SchemaType.NUMBER, description: 'How many candidates to return. Defaults to 5.' }
          },
          required: ['query']
        }
      },
      {
        name: 'ask_about_resumes',
        description: 'Ask a question about candidates whose resumes have already been uploaded to the system. Use this when the user asks about specific uploaded resumes/candidates rather than the general workforce.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING, description: 'The recruiter\'s question about uploaded resumes.' },
            topK: { type: SchemaType.NUMBER, description: 'How many candidates to consider. Defaults to 5.' }
          },
          required: ['question']
        }
      }
    ]
  }
];

async function executeSearchEmployees(args) {
  const topK = Number(args.topK) > 0 ? Number(args.topK) : 5;
  const matches = await performHybridSearch(args.query, {}, topK * 2);
  if (matches.length === 0) return { results: [] };

  const ranked = rankCandidates(matches, args.query).slice(0, topK);
  return {
    results: ranked.map(r => ({
      employeeId: r.employeeId,
      name: r.name,
      businessScore: r.businessScore,
      reason: r.reason,
      designation: r.metadata.designation,
      department: r.metadata.department,
      experience: r.metadata.experience,
      availability: r.metadata.availability
    }))
  };
}

async function executeAskAboutResumes(args) {
  const topK = Number(args.topK) > 0 ? Number(args.topK) : 5;
  const result = await answerQuery(args.question, topK);
  return result;
}

const toolExecutors = {
  search_employees: executeSearchEmployees,
  ask_about_resumes: executeAskAboutResumes
};

module.exports = {
  toolDeclarations,
  toolExecutors
};
