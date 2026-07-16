const skillsMaster = require('../../generator/master/skills');
const domainsMaster = require('../../generator/master/domains');
const certsMaster = require('../../generator/master/certifications');
const logger = require('../utils/logger');

// Flatten skills and technologies
const allSkillsPool = Array.from(new Set(Object.values(skillsMaster).flat()));

/**
 * Extracts relevant keywords (skills, domains, certifications) from a natural language query.
 */
function parseQueryKeywords(query) {
  const qLower = query.toLowerCase();
  
  // 1. Extract Skills
  const parsedSkills = allSkillsPool.filter(skill => {
    const sLower = skill.toLowerCase();
    if (sLower === 'node.js') {
      return qLower.includes('node') || qLower.includes('nodejs');
    }
    // Match word boundaries for short terms like Go, C, etc.
    if (skill.length <= 3) {
      const escaped = sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(qLower);
    }
    return qLower.includes(sLower);
  });

  // 2. Extract Domains
  const parsedDomains = domainsMaster.filter(domain => {
    const dLower = domain.toLowerCase();
    const firstWord = dLower.split(' ')[0];
    return qLower.includes(dLower) || (firstWord.length > 3 && qLower.includes(firstWord));
  });

  // 3. Extract Certifications
  const parsedCerts = certsMaster.filter(cert => {
    const cLower = cert.name.toLowerCase();
    // E.g. AWS Solutions Architect -> ASA
    const shortCode = cert.name.split(' ').map(w => w[0]).join('').replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    return qLower.includes(cLower) || 
           qLower.includes(shortCode) || 
           (cLower.includes('aws') && qLower.includes('aws'));
  });

  return {
    skills: parsedSkills,
    domains: parsedDomains,
    certifications: parsedCerts
  };
}

/**
 * Ranks search matches using the weighted business ranking engine.
 */
function rankCandidates(matches, query) {
  const queryKeywords = parseQueryKeywords(query);
  
  logger.info(`Ranking Engine Parsed Query Keywords:`);
  logger.info(`  - Skills: [${queryKeywords.skills.join(', ')}]`);
  logger.info(`  - Domains: [${queryKeywords.domains.join(', ')}]`);
  logger.info(`  - Certifications: [${queryKeywords.certifications.map(c => c.name).join(', ')}]`);

  const rankedCandidates = matches.map(match => {
    const meta = match.metadata;

    // Parse flat metadata back to arrays
    const empSkills = meta.primarySkills ? meta.primarySkills.split(', ').map(s => s.toLowerCase()) : [];
    const empDomains = meta.domains ? meta.domains.split(', ').map(d => d.toLowerCase()) : [];
    const empCerts = meta.employeeId ? (match.document.toLowerCase()) : ''; // certifications are detailed in knowledgeCard text

    // 1. Semantic Similarity Score (40% weight)
    const semanticSimilarity = match.similarityScore; // cosine similarity (0 to 1)
    const semanticComponent = semanticSimilarity * 100;

    // 2. Skill Match Score (20% weight)
    let skillComponent = 100;
    const matchedSkills = [];
    if (queryKeywords.skills.length > 0) {
      let matchedCount = 0;
      queryKeywords.skills.forEach(skill => {
        const sLower = skill.toLowerCase();
        if (empSkills.some(es => es.includes(sLower) || sLower.includes(es))) {
          matchedCount++;
          matchedSkills.push(skill);
        }
      });
      skillComponent = (matchedCount / queryKeywords.skills.length) * 100;
    }

    // 3. Experience Score (15% weight)
    // Scale experience linearly up to 12 years (12+ years gets max 100 points)
    const experienceYears = Number(meta.experience) || 0;
    const experienceComponent = Math.min(100, (experienceYears / 12) * 100);

    // 4. Certifications Score (10% weight)
    let certComponent = 100;
    const matchedCerts = [];
    if (queryKeywords.certifications.length > 0) {
      let matchedCount = 0;
      queryKeywords.certifications.forEach(cert => {
        const cLower = cert.name.toLowerCase();
        const shortCode = cert.name.split(' ').map(w => w[0]).join('').replace(/[^a-zA-Z]/g, '').toLowerCase();
        
        if (empCerts.includes(cLower) || empCerts.includes(shortCode)) {
          matchedCount++;
          matchedCerts.push(cert.name);
        }
      });
      certComponent = (matchedCount / queryKeywords.certifications.length) * 100;
    } else {
      // If no cert is requested, score based on number of certs employee has
      // Let's check card text for standard indicators or approximate. 
      // We can check how many commas/and in certifications. Since we store flat certifications inside documents, let's look at counts.
      // Alternatively, let's assign standard score based on experience
      certComponent = Math.min(100, (experienceYears >= 5 ? 100 : experienceYears * 20));
    }

    // 5. Domain Match Score (10% weight)
    let domainComponent = 100;
    const matchedDomains = [];
    if (queryKeywords.domains.length > 0) {
      let matchedCount = 0;
      queryKeywords.domains.forEach(domain => {
        const dLower = domain.toLowerCase();
        if (empDomains.some(ed => ed.includes(dLower) || dLower.includes(ed))) {
          matchedCount++;
          matchedDomains.push(domain);
        }
      });
      domainComponent = (matchedCount / queryKeywords.domains.length) * 100;
    }

    // 6. Availability Score (5% weight)
    let availabilityComponent = 50;
    const avail = meta.availability ? meta.availability.toLowerCase() : '';
    if (avail === 'available') {
      availabilityComponent = 100;
    } else if (avail.includes('2 weeks')) {
      availabilityComponent = 75;
    } else if (avail.includes('1 month')) {
      availabilityComponent = 50;
    } else if (avail === 'allocated') {
      availabilityComponent = 25;
    }

    // Calculate final weighted business score
    const finalScore = Math.round(
      (semanticComponent * 0.40) +
      (skillComponent * 0.20) +
      (experienceComponent * 0.15) +
      (certComponent * 0.10) +
      (domainComponent * 0.10) +
      (availabilityComponent * 0.05)
    );

    // Formulate a structured explanation "Reason"
    let reason = `${meta.name} exhibits a strong semantic similarity score of ${(semanticSimilarity * 100).toFixed(0)}%.`;
    
    if (matchedSkills.length > 0) {
      reason += ` Matches key skills: ${matchedSkills.join(', ')}.`;
    }
    
    if (matchedDomains.length > 0) {
      reason += ` Has domain experience in: ${matchedDomains.join(', ')}.`;
    }

    if (matchedCerts.length > 0) {
      reason += ` Holds relevant certifications: ${matchedCerts.join(', ')}.`;
    }

    reason += ` Possesses ${meta.experience} years of experience and is currently ${meta.availability}.`;

    return {
      employeeId: match.employeeId,
      name: meta.name,
      semanticScore: Number(semanticSimilarity.toFixed(4)),
      businessScore: finalScore,
      reason,
      metadata: {
        ...meta,
        similarityScore: semanticSimilarity
      }
    };
  });

  // Sort by business score descending
  rankedCandidates.sort((a, b) => b.businessScore - a.businessScore);

  return rankedCandidates;
}

module.exports = {
  parseQueryKeywords,
  rankCandidates
};
