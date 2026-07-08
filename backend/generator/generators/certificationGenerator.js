const certificationPool = require('../master/certifications');
const config = require('../config/config');
const { randomElement, randomElements, randomRange } = require('../utils/random');

/**
 * Assigns professional certifications to employees based on their personas.
 * Modifies the employees array in place.
 */
function generateCertifications(employees, totalEmployees) {
  const targetCertCount = Math.max(20, Math.round(totalEmployees * config.CERTIFICATIONS_RATIO));
  let assignedCount = 0;

  // Let's create helper to map designation to persona category
  const getPersonaCategory = (employee) => {
    const des = employee.designation;
    if (des === 'Engineering Manager') return 'Engineering Management';
    if (des === 'Solution Architect') return 'Architecture';
    // Else check skills category to guess persona
    if (employee.primarySkills.length > 0) {
      return employee.primarySkills[0].category;
    }
    return 'Backend';
  };

  // We assign certifications to employees who match the target personas
  // Experienced employees get more certifications
  const employeeWeights = employees.map(emp => {
    let weight = emp.experience + 1; // More experience = more likely to have certs
    return { employee: emp, weight };
  });

  // Calculate sum of weights
  const totalWeight = employeeWeights.reduce((sum, item) => sum + item.weight, 0);

  // We will distribute the targetCertCount certifications across employees proportionally to their weight
  employees.forEach((emp) => {
    emp.certifications = [];
  });

  let attempts = 0;
  while (assignedCount < targetCertCount && attempts < targetCertCount * 5) {
    attempts++;
    // Pick employee using weighted random selection
    let rand = Math.random() * totalWeight;
    let selectedEmp = null;
    
    for (const item of employeeWeights) {
      rand -= item.weight;
      if (rand <= 0) {
        selectedEmp = item.employee;
        break;
      }
    }
    if (!selectedEmp) selectedEmp = employees[0];

    const empPersona = getPersonaCategory(selectedEmp);
    
    // Find matching certifications for this employee's persona
    const matchingCerts = certificationPool.filter(cert => cert.personas.includes(empPersona));

    if (matchingCerts.length > 0) {
      // Pick a random matching certification that the employee doesn't already have
      const chosenCert = randomElement(matchingCerts);
      const isAlreadyAssigned = selectedEmp.certifications.some(c => c.name === chosenCert.name);

      if (!isAlreadyAssigned) {
        // Generate issue date (aligned with their experience, e.g. within their career window)
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - selectedEmp.experience;
        // Issue date between (startYear) and (currentYear - 1) or current year
        const issueYear = randomRange(startYear, currentYear);
        const issueMonth = String(randomRange(1, 12)).padStart(2, '0');
        const issueDay = String(randomRange(1, 28)).padStart(2, '0');
        const issueDate = `${issueYear}-${issueMonth}-${issueDay}`;

        // Alphanumeric credential ID
        const shortCode = chosenCert.name.split(' ').map(w => w[0]).join('').replace(/[^a-zA-Z]/g, '');
        const randomNum = randomRange(100000, 999999);
        const credentialId = `${shortCode}-${randomNum}`;

        selectedEmp.certifications.push({
          name: chosenCert.name,
          issuingOrganisation: chosenCert.issuingOrg,
          issueDate,
          credentialId
        });

        assignedCount++;
      }
    }
  }

  // Ensure that every employee with >= 3 years experience has at least one certification 
  // to satisfy "No field should be null" (and maintain high quality)
  employees.forEach(emp => {
    if (emp.experience >= 3 && emp.certifications.length === 0) {
      const empPersona = getPersonaCategory(emp);
      const matchingCerts = certificationPool.filter(cert => cert.personas.includes(empPersona));
      if (matchingCerts.length > 0) {
        const chosenCert = randomElement(matchingCerts);
        
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - emp.experience;
        const issueYear = randomRange(startYear, currentYear);
        const issueDate = `${issueYear}-06-15`;
        
        const shortCode = chosenCert.name.split(' ').map(w => w[0]).join('').replace(/[^a-zA-Z]/g, '');
        const credentialId = `${shortCode}-${randomRange(100000, 999999)}`;

        emp.certifications.push({
          name: chosenCert.name,
          issuingOrganisation: chosenCert.issuingOrg,
          issueDate,
          credentialId
        });
      }
    }
  });

  return employees;
}

module.exports = {
  generateCertifications
};
