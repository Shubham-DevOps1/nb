const { randomElement, randomElements, randomRange } = require('../utils/random');

const achievementsPool = [
  'Recognized as Employee of the Quarter for driving complex project deliverable to completion.',
  'Spearheaded the migration of modular architectures, reducing codebase size by 20%.',
  'Mentored 3 junior software engineers, accelerating their ramp-up time by 50%.',
  'Optimized legacy SQL query speeds, reducing page load delays by 1.2 seconds.',
  'Awarded "Innovator of the Year" for developing an internal tool that saved 10 engineering hours weekly.',
  'Authored a technical white paper on building secure, distributed REST architectures internally.',
  'Successfully delivered a critical client integration 2 weeks ahead of scheduled deadline.'
];

const prevCompanies = [
  'InnovaTech Systems',
  'CloudScale Tech',
  'Delta Software Solutions',
  'Apex Systems Inc.',
  'GridLine Energy Dev',
  'Nexa Corp',
  'LogiQuest Global'
];

const toolsPool = {
  'Backend': ['Git', 'VS Code', 'Postman', 'Docker', 'Linux', 'Swagger', 'JIRA'],
  'Frontend': ['Git', 'VS Code', 'Chrome DevTools', 'Figma', 'Postman', 'NPM', 'JIRA'],
  'Cloud': ['Git', 'AWS CLI', 'Terraform CLI', 'Linux', 'Docker', 'Kubernetes CLI', 'Kubectl'],
  'DevOps': ['Git', 'Docker', 'Kubernetes', 'Ansible', 'Linux', 'Prometheus', 'Grafana', 'Jenkins'],
  'AI': ['Git', 'Jupyter Notebook', 'Anaconda', 'Docker', 'Linux', 'VS Code', 'ChromaDB'],
  'IoT': ['Git', 'Arduino IDE', 'VS Code', 'Wireshark', 'Linux', 'Docker', 'Mosquitto'],
  'Embedded': ['Git', 'Keil MDK', 'STM32CubeMX', 'GCC Compiler', 'Oscilloscope', 'Multimeter'],
  'QA': ['Git', 'VS Code', 'Postman', 'JMeter', 'JIRA', 'Chrome DevTools', 'Allure'],
  'Architecture': ['Git', 'Draw.io', 'Figma', 'Confluence', 'Enterprise Architect', 'JIRA'],
  'Engineering Management': ['JIRA', 'Confluence', 'MS Project', 'Slack', 'Excel', 'Trello']
};

/**
 * Helper to determine persona category based on employee skills
 */
function getPersonaCategory(employee) {
  const des = employee.designation;
  if (des === 'Engineering Manager') return 'Engineering Management';
  if (des === 'Solution Architect') return 'Architecture';
  if (employee.primarySkills.length > 0) {
    return employee.primarySkills[0].category;
  }
  return 'Backend';
}

/**
 * Generates Resume JSON for every employee.
 * Modifies employee in place and returns list of resumes.
 */
function generateResumes(employees) {
  const resumes = [];

  employees.forEach(employee => {
    const personaKey = getPersonaCategory(employee);
    const tools = toolsPool[personaKey] || toolsPool['Backend'];
    
    // 1. Build Work Experience History
    const experienceHistory = [];
    
    // Current role at TalentIQ AI
    const currentStartDate = employee.joiningDate;
    experienceHistory.push({
      company: 'TalentIQ AI Platform',
      role: employee.designation,
      startDate: currentStartDate,
      endDate: 'Present',
      description: `Serving as a ${employee.designation} within the ${employee.department} department. Contributing to enterprise initiatives, collaborating with cross-functional teams, and delivering high-quality production code. Key feedback: ${employee.managerFeedback}`
    });

    // Previous roles (if total experience is greater than time spent at current company)
    const currentYear = new Date().getFullYear();
    const currentJoinYear = new Date(currentStartDate).getFullYear();
    const yearsAtCurrent = Math.max(0, currentYear - currentJoinYear);
    
    let yearsRemaining = employee.experience - yearsAtCurrent;
    let loopYear = currentJoinYear;

    let compIndex = 0;
    while (yearsRemaining > 0 && compIndex < 2) {
      const prevExpLength = Math.max(1, Math.min(yearsRemaining, randomRange(2, 4)));
      const prevStartYear = loopYear - prevExpLength;
      
      const compName = prevCompanies[(compIndex + employee.experience) % prevCompanies.length];
      
      // Determine a realistic previous designation
      let prevRole = 'Software Engineer';
      if (employee.designation === 'Engineering Manager' || employee.designation === 'Solution Architect') {
        prevRole = 'Senior Software Engineer';
      } else if (employee.designation === 'Senior Engineer' || employee.designation === 'Technical Lead') {
        prevRole = 'Software Engineer';
      } else {
        prevRole = 'Associate Software Engineer';
      }

      experienceHistory.push({
        company: compName,
        role: prevRole,
        startDate: `${prevStartYear}-04-01`,
        endDate: `${loopYear}-02-28`,
        description: `Contributed as a ${prevRole} handling system development, core feature creation, and engineering tasks. Collaborated with teams on delivery workflows.`
      });

      yearsRemaining -= prevExpLength;
      loopYear = prevStartYear;
      compIndex++;
    }

    // 2. Select Achievements (1-3)
    const achievementsCount = randomRange(1, 3);
    const achievements = randomElements(achievementsPool, achievementsCount);

    // 3. Construct Resume JSON object
    const resume = {
      professionalSummary: `${employee.name} is a ${employee.designation} with ${employee.experience} years of hands-on industry experience. Specializes in ${employee.primarySkills.map(s => s.name).join(', ')}. ${employee.summary}`,
      experience: experienceHistory,
      projects: employee.projects.map(p => ({
        projectName: p.projectName,
        role: p.role,
        startDate: p.startDate,
        endDate: p.endDate,
        description: p.description
      })),
      education: employee.education,
      skills: [
        ...employee.primarySkills.map(s => ({ name: s.name, level: s.level, type: 'Primary' })),
        ...employee.secondarySkills.map(s => ({ name: s.name, level: s.level, type: 'Secondary' }))
      ],
      certifications: employee.certifications,
      achievements,
      languages: employee.languages,
      tools
    };

    // Assign to employee record
    employee.resumeJson = resume;

    // Push to standalone list
    resumes.push({
      employeeId: employee.employeeId,
      name: employee.name,
      resume
    });
  });

  return resumes;
}

module.exports = {
  generateResumes
};
