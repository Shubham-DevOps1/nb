const { loadJsonFile } = require('../utils/fileLoader');
const { validateRecords } = require('./validateKnowledgeCards');
const { getEmbeddingsInBatches } = require('../embeddings/batchEmbeddingService');
const { getCollection, resetCollection, upsertEmployeeBatch, getCollectionCount } = require('../chroma/employeeCollection');
const { startTimer } = require('../utils/timer');
const logger = require('../utils/logger');
const config = require('../config/chromaConfig');

/**
 * Retries a promise-returning function with exponential backoff.
 */
/**
 * Chroma metadata only accepts flat string/number/bool values, so per-skill
 * detail (level, years, primary-vs-secondary) can't be stored as nested
 * objects. Encode each skill as "name|level|years", joined by ";" - parsed
 * back out in resourceMatcher.js.
 */
function encodeSkillsDetailed(skills) {
  if (!skills || skills.length === 0) return '';
  return skills
    .map(s => `${s.name}|${s.level || ''}|${s.yearsOfExperience || 0}`)
    .join(';');
}

async function retryWithBackoff(operation, label, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === retries) {
        logger.error(`Operation [${label}] failed after ${retries} attempts.`);
        throw err;
      }
      logger.warn(`[ATTEMPT ${attempt}/${retries}] Operation [${label}] failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function ingest() {
  logger.info('================ STARTING INGESTION PIPELINE ================');
  const totalTimer = startTimer();

  try {
    // 1. Load data files
    logger.info('Loading JSON datasets...');
    const cardsRaw = loadJsonFile('knowledgeCards.json');
    const employeesRaw = loadJsonFile('employees.json');

    // Create a map of employee metadata for quick O(1) lookup
    const employeesMap = new Map();
    employeesRaw.forEach(emp => {
      employeesMap.set(emp.employeeId, emp);
    });

    // 2. Validate records
    logger.info('Validating knowledge card records...');
    const validCards = validateRecords(cardsRaw);
    logger.success(`Validation finished: ${validCards.length}/${cardsRaw.length} records are valid.`);

    if (validCards.length === 0) {
      throw new Error('No valid knowledge card records to ingest.');
    }

    // 3. Setup ChromaDB Collection
    logger.info('Retrieving and resetting ChromaDB collection...');
    // We reset collection first to prevent duplicate entries and ensure clean index state
    await resetCollection();
    const collection = await getCollection();
    logger.success(`Connected to ChromaDB collection: '${config.COLLECTION_NAME}'`);

    // 4. Batch Embeddings Generation
    logger.info('Generating semantic embeddings for knowledge cards...');
    const texts = validCards.map(c => c.knowledgeCard);
    
    const embedTimer = startTimer();
    const embeddings = await getEmbeddingsInBatches(texts);
    const totalEmbedTime = embedTimer.stop();
    
    logger.success(`Embeddings calculated: ${embeddings.length} vectors generated in ${totalEmbedTime.toFixed(2)}ms.`);
    logger.info(`Average embedding calculation time: ${(totalEmbedTime / embeddings.length).toFixed(2)}ms per document.`);

    // 5. Build Metadata & Batch Insert
    logger.info('Indexing documents and metadata in vector database...');
    
    const ids = [];
    const metadatas = [];
    const documents = [];
    const batchEmbeds = [];

    validCards.forEach((card, idx) => {
      const empInfo = employeesMap.get(card.employeeId);
      
      if (!empInfo) {
        logger.warn(`Employee details missing in employees.json for ID: ${card.employeeId}. Using basic metadata.`);
      }

      // ChromaDB metadata constraints: only simple key-value pairs (string, int, float, bool)
      const metadata = {
        employeeId: card.employeeId,
        name: card.name,
        department: empInfo ? empInfo.department : 'Unknown',
        designation: empInfo ? empInfo.designation : 'Unknown',
        experience: empInfo ? Number(empInfo.experience) : 0,
        location: empInfo ? empInfo.location : 'Unknown',
        availability: empInfo ? empInfo.availability : 'Unknown',
        performanceRating: empInfo ? Number(empInfo.performanceRating) : 0.0,
        domains: empInfo ? empInfo.domains.join(', ') : '',
        primarySkills: empInfo ? empInfo.primarySkills.map(s => s.name).join(', ') : '',
        primarySkillsDetailed: empInfo ? encodeSkillsDetailed(empInfo.primarySkills) : '',
        secondarySkillsDetailed: empInfo ? encodeSkillsDetailed(empInfo.secondarySkills) : '',
        certifications: empInfo && empInfo.certifications ? empInfo.certifications.map(c => c.name).join(', ') : '',
        manager: empInfo ? empInfo.managerName : 'Board of Directors'
      };

      ids.push(card.employeeId);
      batchEmbeds.push(embeddings[idx]);
      metadatas.push(metadata);
      documents.push(card.knowledgeCard);
    });

    // Write to ChromaDB in chunks (to ensure we don't hit RPC limits if N is huge)
    const dbBatchSize = 100;
    const dbTimer = startTimer();
    
    for (let i = 0; i < ids.length; i += dbBatchSize) {
      const endIdx = Math.min(ids.length, i + dbBatchSize);
      const subIds = ids.slice(i, endIdx);
      const subEmbeds = batchEmbeds.slice(i, endIdx);
      const subMetas = metadatas.slice(i, endIdx);
      const subDocs = documents.slice(i, endIdx);

      // Perform upsert with retries
      await retryWithBackoff(
        () => upsertEmployeeBatch(collection, subIds, subEmbeds, subMetas, subDocs),
        `Upsert batch ${i}-${endIdx}`,
        3,
        1500
      );

      logger.info(`Indexed batch ${i + subIds.length}/${ids.length} in ChromaDB.`);
    }

    const totalTimeSec = totalTimer.stopSeconds();
    const finalCount = await getCollectionCount(collection);

    logger.success('\n================ INGESTION COMPLETE ================');
    logger.success(`- Employees Indexed      : ${finalCount}`);
    logger.success(`- Collection Sized       : ${finalCount} records`);
    logger.success(`- Time Taken             : ${totalTimeSec.toFixed(2)} seconds`);
    logger.success(`- Average Embedding Time : ${(totalEmbedTime / embeddings.length).toFixed(2)} ms`);
    logger.success('====================================================\n');

  } catch (err) {
    logger.error('Ingestion pipeline failed critically!', err);
    process.exit(1);
  }
}

if (require.main === module) {
  ingest();
}

module.exports = {
  ingest
};
