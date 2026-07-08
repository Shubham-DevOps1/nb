const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const rolesMetadata = require('../master/roles');
const personas = require('../master/personas');
const departments = require('../master/departments');
const locations = require('../master/locations');
const firstNames = require('../master/firstNames');
const lastNames = require('../master/lastNames');
const { randomElement, randomElements, randomRange, randomFloat, randomDate } = require('../utils/random');
const { generateUniqueEmail, resetEmails } = require('../utils/helpers');

const universityNames = [
  'Stanford University',
  'Massachusetts Institute of Technology (MIT)',
  'University of California, Berkeley',
  'Carnegie Mellon University',
  'Indian Institute of Technology (IIT), Bombay',
  'Indian Institute of Technology (IIT), Delhi',
  'Technical University of Munich',
  'University of Toronto',
  'Oxford University',
  'Tokyo Institute of Technology'
];

const degreeNames = [
  'B.S. in Computer Science',
  'M.S. in Computer Science',
  'B.Tech in Information Technology',
  'M.Tech in Software Engineering',
  'B.S. in Computer Engineering',
  'Ph.D. in Machine Learning'
];

const languagePool = ['English', 'Spanish', 'German', 'French', 'Japanese', 'Hindi', 'Mandarin'];

const nameSet = new Set();

/**
 * Generates N employees based on role distributions.
 */
function generateEmployees(totalEmployees) {
  resetEmails();
  nameSet.clear();

  const employees = [];
  const roles = Object.keys(config.ROLE_DISTRIBUTION);
  
  // 1. Calculate role counts
  const roleCounts = {};
  let allocatedCount = 0;

  roles.forEach(role => {
    roleCounts[role] = Math.floor(config.ROLE_DISTRIBUTION[role] * totalEmployees);
    allocatedCount += roleCounts[role];
  });

  // Reconcile rounding differences to ensure we get exactly totalEmployees
  let diff = totalEmployees - allocatedCount;
  roleCounts['Software Engineer'] += diff;

  // 2. Generate employees for each role
  roles.forEach(role => {
    const count = roleCounts[role];
    const metadata = rolesMetadata[role];

    for (let i = 0; i < count; i++) {
      // Create Name
      let firstName = randomElement(firstNames);
      let lastName = randomElement(lastNames);
      let fullName = `${firstName} ${lastName}`;

      // Handle name duplicates at scale
      let nameKey = fullName.toLowerCase();
      let attempt = 0;
      while (nameSet.has(nameKey) && attempt < 100) {
        firstName = randomElement(firstNames);
        lastName = randomElement(lastNames);
        fullName = `${firstName} ${lastName}`;
        nameKey = fullName.toLowerCase();
        attempt++;
      }
      if (nameSet.has(nameKey)) {
        // Fallback suffix
        fullName = `${fullName} ${randomRange(1, 99)}`;
      }
      nameSet.add(fullName.toLowerCase());

      const email = generateUniqueEmail(firstName, lastName);
      const experience = randomRange(metadata.minExp, metadata.maxExp);
      const location = randomElement(locations);
      
      // Joining Date is based on experience (usually within the last 5 years or experience limit)
      const currentYear = new Date().getFullYear();
      const maxJoiningYearsAgo = Math.min(experience, 6);
      const joiningYearsAgo = randomRange(0, maxJoiningYearsAgo);
      const startYear = currentYear - joiningYearsAgo;
      const joiningDate = randomDate(new Date(startYear, 0, 1), new Date(startYear, 11, 31));

      // Availability distribution
      const availabilityOpts = ['Available', 'Allocated', 'Available in 2 weeks', 'Available in 1 month'];
      let availability = randomElement(availabilityOpts);
      if (role === 'Engineering Manager') {
        // Managers are rarely "Available" without a transition period
        availability = randomElement(['Allocated', 'Available in 2 weeks', 'Available in 1 month']);
      }

      // Performance rating between 3.0 and 5.0
      const performanceRating = randomFloat(3.5, 5.0, 1);

      // Select persona
      let personaKey = 'Backend';
      if (role === 'Engineering Manager') {
        personaKey = 'Engineering Management';
      } else if (role === 'Solution Architect') {
        personaKey = 'Architecture';
      } else {
        personaKey = randomElement(['Backend', 'Frontend', 'Cloud', 'DevOps', 'AI', 'IoT', 'Embedded', 'QA']);
      }
      const persona = personas[personaKey];

      // Department
      let department = randomElement(departments);
      if (role === 'Engineering Manager') {
        department = 'Core Product Engineering';
      }

      // Generate skills
      const totalSkillsCount = randomRange(6, 12);
      const primaryCount = Math.min(persona.primarySkills.length, Math.ceil(totalSkillsCount / 2));
      const secondaryCount = totalSkillsCount - primaryCount;

      const selectedPrimary = randomElements(persona.primarySkills, primaryCount);
      const selectedSecondary = randomElements(persona.secondarySkills, secondaryCount);

      const skillRecordsMap = new Map();

      // Helper to determine skill level based on years of experience
      const getSkillLevel = (years) => {
        if (years >= 6) return 'Expert';
        if (years >= 4) return 'Advanced';
        if (years >= 2) return 'Intermediate';
        return 'Beginner';
      };

      selectedPrimary.forEach(skill => {
        // Primary skills have high experience (50% to 90% of total experience, at least 1 year)
        const skillExp = Math.max(1, Math.round(experience * randomFloat(0.5, 0.9)));
        skillRecordsMap.set(skill, {
          name: skill,
          category: personaKey,
          level: getSkillLevel(skillExp),
          yearsOfExperience: skillExp
        });
      });

      selectedSecondary.forEach(skill => {
        if (!skillRecordsMap.has(skill)) {
          // Secondary skills have moderate experience (20% to 60% of total experience, at least 0 years)
          const skillExp = Math.max(0, Math.round(experience * randomFloat(0.2, 0.6)));
          skillRecordsMap.set(skill, {
            name: skill,
            category: personaKey,
            level: getSkillLevel(skillExp),
            yearsOfExperience: skillExp
          });
        }
      });

      const primarySkills = Array.from(skillRecordsMap.values()).slice(0, primaryCount);
      const secondarySkills = Array.from(skillRecordsMap.values()).slice(primaryCount);

      // Domains
      const domainCount = randomRange(1, 3);
      const domains = randomElements(persona.domains, domainCount);

      // Languages
      const langCount = randomRange(1, 3);
      const languages = randomElements(languagePool, langCount);

      // Education
      const eduYear = currentYear - experience - 1; // Graduated just before gaining professional exp
      const degree = randomElement(degreeNames);
      const university = randomElement(universityNames);
      const education = {
        degree,
        institution: university,
        passingYear: eduYear
      };

      const employeeId = uuidv4();

      employees.push({
        employeeId,
        name: fullName,
        email,
        designation: role,
        department,
        experience,
        location,
        joiningDate,
        availability,
        performanceRating,
        salaryBand: metadata.salaryBand,
        primarySkills,
        secondarySkills,
        projects: [],      // Assigned by projects generator
        domains,
        certifications: [], // Assigned by certifications generator
        languages,
        education,
        managerId: '',      // Assigned by hierarchy generator
        managerName: '',    // Assigned by hierarchy generator
        summary: persona.summaryTemplate,
        managerFeedback: '', // Assigned by manager feedback generator
        knowledgeCard: '',   // Assigned by knowledge card generator
        resumeJson: {}       // Assigned by resume generator
      });
    }
  });

  return employees;
}

module.exports = {
  generateEmployees
};
