/**
 * Helper to convert numbers to words for natural flow
 */
function numberToWords(num) {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 
                 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  if (num >= 0 && num <= 20) return words[num];
  return num.toString();
}

/**
 * Generates a 200-400 word semantic knowledge card for an employee.
 */
function generateSingleKnowledgeCard(employee) {
  const name = employee.name;
  const des = employee.designation;
  const expWords = numberToWords(employee.experience);
  const dept = employee.department;
  const loc = employee.location;
  
  // Paragraph 1: Profile Summary
  const p1 = `${name} serves as a ${des} at our organization, bringing ${expWords} years of professional engineering experience to the ${dept} department. Currently operating from the ${loc} hub, ${name} has built a solid career path centered around software quality, engineering best practices, and collaborative delivery.`;

  // Paragraph 2: Skills & Tech
  const primaryNames = employee.primarySkills.map(s => `${s.name} (${s.level})`).join(', ');
  const secondaryNames = employee.secondarySkills.map(s => `${s.name} (${s.level})`).join(', ');
  const p2 = `In terms of technical capabilities, ${name} specializes primarily in ${primaryNames}. These core competencies are supported by a strong secondary skill matrix including ${secondaryNames}. This blend of technical tools enables ${name} to address full-lifecycle software engineering challenges, from initial schema designs to production deployment debugging.`;

  // Paragraph 3: Projects & Domains
  const projSummaries = employee.projects.map(p => {
    return `worked as a ${p.role} on the ${p.projectName} project, which involved ${p.description.toLowerCase().replace(/\.$/, '')}`;
  });
  
  let p3 = '';
  if (projSummaries.length > 0) {
    const domainList = employee.domains.join(' and ');
    p3 = `Throughout their career with us, ${name} has successfully delivered multiple projects, showcasing versatility. Specifically, ${name} has ${projSummaries.slice(0, 3).join(', and moreover, ') || 'contributed to core enterprise modules'}. These hands-on engagements have allowed ${name} to develop deep vertical knowledge in the domains of ${domainList}.`;
  } else {
    p3 = `${name} has been engaged in various internal research spikes and core product maintenance tasks, focusing on building high-reliability services in the ${employee.domains[0] || 'software'} domain.`;
  }

  // Paragraph 4: Certifications & Feedback
  const certText = employee.certifications.length > 0
    ? `holds professional credentials including the ${employee.certifications.map(c => c.name).join(' and the ')}`
    : `focuses on continuous learning and on-the-job training`;

  const p4 = `Regarding professional achievements and peer recognition, ${name} ${certText}. In terms of performance feedback, ${name} has earned a rating of ${employee.performanceRating.toFixed(1)} out of 5.0. Managers and technical leads have noted that: "${employee.managerFeedback}"`;

  // Paragraph 5: Education, Languages & Availability
  const edu = employee.education;
  const langText = employee.languages.join(' and ');
  
  let availabilityText = '';
  if (employee.availability.toLowerCase() === 'available') {
    availabilityText = 'is currently available for immediate project allocation';
  } else if (employee.availability.toLowerCase().includes('weeks') || employee.availability.toLowerCase().includes('month')) {
    availabilityText = `is currently allocated but is scheduled to be available for new projects in ${employee.availability.toLowerCase().replace('available in ', '')}`;
  } else {
    availabilityText = 'is currently fully allocated to active client deliverables';
  }

  const p5 = `Academically, ${name} earned a ${edu.degree} from ${edu.institution} in ${edu.passingYear}. ${name} communicates fluently in ${langText}, facilitating smooth engagement with distributed global stakeholders. Currently, ${name} ${availabilityText}.`;

  // Join all paragraphs with newlines to form the knowledge card
  return [p1, p2, p3, p4, p5].join('\n\n');
}

/**
 * Generates knowledge cards for all employees.
 * Modifies employees in place and returns standalone list.
 */
function generateKnowledgeCards(employees) {
  const cards = [];
  employees.forEach(employee => {
    const cardText = generateSingleKnowledgeCard(employee);
    employee.knowledgeCard = cardText;
    cards.push({
      employeeId: employee.employeeId,
      name: employee.name,
      knowledgeCard: cardText
    });
  });
  return cards;
}

module.exports = {
  generateKnowledgeCards
};
