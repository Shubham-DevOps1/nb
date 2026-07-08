const { loadJsonFile } = require('../utils/fileLoader');
const { performSemanticSearch } = require('../search/semanticSearch');
const { rankCandidates } = require('../search/rankingEngine');
const { calculatePrecisionAtK, calculateRecall, calculateMRR, isTruePositive } = require('./metrics');
const { startTimer } = require('../utils/timer');
const { getCollection, getCollectionCount } = require('../chroma/employeeCollection');
const logger = require('../utils/logger');

async function runEvaluation() {
  logger.info('================ STARTING BENCHMARK SUITE ================');
  
  try {
    // 1. Load benchmark and employees data
    const queries = loadJsonFile('benchmarkQueries.json');
    const employees = loadJsonFile('employees.json');

    // Fetch collection count
    let collectionSize = 0;
    try {
      const collection = await getCollection();
      collectionSize = await getCollectionCount(collection);
    } catch (e) {
      logger.warn('Could not read collection count from ChromaDB. Is the service running?');
    }

    if (collectionSize === 0) {
      logger.error('ChromaDB collection is empty! Please run "npm run ingest" first.');
      process.exit(1);
    }

    let totalP5 = 0;
    let totalRecall = 0;
    let totalMRR = 0;
    let totalTime = 0;

    console.log('\n| Query ID | Query Text | P@5 | Recall | MRR | Latency (ms) |');
    console.log('|----------|------------|-----|--------|-----|--------------|');

    const detailedMetrics = [];

    for (const q of queries) {
      const timer = startTimer();
      
      // A. Perform semantic vector search (retrieving up to 100 for recall evaluation)
      const matches = await performSemanticSearch(q.query, 100);
      
      // B. Rank using business logic
      const rankedMatches = rankCandidates(matches, q.query);
      
      const searchTime = timer.stop();

      // C. Calculate total relevant items in full database
      const totalRelevant = employees.filter(emp => {
        // Map database fields to metadata structure for evaluation validation
        const meta = {
          designation: emp.designation,
          primarySkills: emp.primarySkills.map(s => s.name).join(', '),
          domains: emp.domains.join(', ')
        };
        const doc = emp.knowledgeCard;
        return isTruePositive(meta, doc, q.expectedCriteria);
      }).length;

      // D. Calculate Quality Metrics
      const p5 = calculatePrecisionAtK(rankedMatches, q.expectedCriteria, 5);
      const recall = calculateRecall(rankedMatches, q.expectedCriteria, totalRelevant);
      const mrr = calculateMRR(rankedMatches, q.expectedCriteria);

      totalP5 += p5;
      totalRecall += recall;
      totalMRR += mrr;
      totalTime += searchTime;

      console.log(`| ${q.id.padEnd(8)} | ${q.query.padEnd(45).substring(0, 45)} | ${p5.toFixed(2)} | ${recall.toFixed(2)} | ${mrr.toFixed(2)} | ${searchTime.toFixed(1).padStart(12)} |`);
      
      detailedMetrics.push({
        id: q.id,
        query: q.query,
        p5,
        recall,
        mrr,
        latency: searchTime
      });
    }

    const qCount = queries.length;
    const avgP5 = totalP5 / qCount;
    const avgRecall = totalRecall / qCount;
    const avgMRR = totalMRR / qCount;
    const avgLatency = totalTime / qCount;

    console.log('\n================ EVALUATION SUMMARY REPORT ================');
    console.log(`- Total Benchmark Queries   : ${qCount}`);
    console.log(`- Indexed Collection Size   : ${collectionSize} employees`);
    console.log(`- Mean Precision@5          : ${(avgP5 * 100).toFixed(2)}%`);
    console.log(`- Mean Recall               : ${(avgRecall * 100).toFixed(2)}%`);
    console.log(`- Mean Reciprocal Rank (MRR): ${avgMRR.toFixed(4)}`);
    console.log(`- Average Search Latency    : ${avgLatency.toFixed(2)} ms`);
    console.log('===========================================================\n');

  } catch (err) {
    logger.error('Critical failure running benchmark query evaluation', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runEvaluation();
}

module.exports = {
  runEvaluation
};
