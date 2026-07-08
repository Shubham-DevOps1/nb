const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const clientPool = require('../master/clients');
const domains = require('../master/domains');
const projectTemplates = require('../master/projectTemplates');
const { randomElement, randomElements, randomRange, randomFloat } = require('../utils/random');

/**
 * Generates a list of clients, scaling dynamically.
 */
function generateClients(totalEmployees) {
  const targetClientsCount = Math.max(5, Math.round(totalEmployees * config.CLIENTS_RATIO));
  const clients = [];
  
  for (let i = 0; i < targetClientsCount; i++) {
    if (i < clientPool.length) {
      clients.push(clientPool[i]);
    } else {
      // Dynamic client generation fallback
      clients.push(`Enterprise Client #${i + 1}`);
    }
  }
  return clients;
}

/**
 * Generates N projects and associates employees with them.
 * Modifies the employees array in place.
 */
function generateProjects(employees, totalEmployees) {
  const targetProjectsCount = Math.max(10, Math.round(totalEmployees * config.PROJECTS_RATIO));
  const clients = generateClients(totalEmployees);
  const projects = [];

  const complexityOptions = ['Low', 'Medium', 'High'];
  const statusOptions = ['Completed', 'Active', 'Pipeline'];
  // Role options for project team members
  const rolesInProject = [
    'Lead Engineer', 
    'Senior Developer', 
    'Core Contributor', 
    'QA Lead', 
    'Architect', 
    'DevOps Specialist', 
    'Deployment Engineer'
  ];

  // 1. Generate standalone projects
  for (let i = 0; i < targetProjectsCount; i++) {
    const projectId = uuidv4();
    const client = randomElement(clients);
    const domain = randomElement(domains);
    
    // Get template for the chosen domain
    const template = projectTemplates.templates[domain];
    const description = randomElement(template.descriptions);
    
    // Choose project name
    const prefix = randomElement(projectTemplates.prefixes);
    const suffix = randomElement(projectTemplates.suffixes);
    const nameKeyword = domain.split(' ')[0]; // E.g., Smart, HVAC, Healthcare
    const projectName = `${prefix} ${nameKeyword} ${suffix} #${i + 1}`;

    const complexity = randomElement(complexityOptions);
    const durationMonths = randomRange(3, 24);
    const duration = `${durationMonths} months`;
    
    let budget = 0;
    if (complexity === 'Low') budget = randomRange(50000, 150000);
    else if (complexity === 'Medium') budget = randomRange(150000, 500000);
    else budget = randomRange(500000, 2000000);

    const teamSize = randomRange(3, 12);
    
    // Assign status (weighted: 70% Completed, 20% Active, 10% Pipeline)
    const statusRand = Math.random();
    let status = 'Completed';
    if (statusRand > 0.90) status = 'Pipeline';
    else if (statusRand > 0.70) status = 'Active';

    // Primary project focus role
    const primaryRoleOptions = ['Full Stack', 'Backend Systems', 'Edge Ingestion', 'AI Automation', 'Infrastructure Operations'];
    const projectFocusRole = randomElement(primaryRoleOptions);

    projects.push({
      projectId,
      projectName,
      client,
      domain,
      duration,
      budget,
      technologies: template.technologies,
      role: projectFocusRole,
      description,
      projectComplexity: complexity,
      teamSize,
      status
    });
  }

  // 2. Associate employees with 2 to 6 projects each
  employees.forEach(employee => {
    const projectCount = randomRange(2, 6);
    
    // Find project candidates with matching skills or domains
    const empSkillNames = [
      ...employee.primarySkills.map(s => s.name),
      ...employee.secondarySkills.map(s => s.name)
    ];

    // Score and filter projects for this employee based on technology overlap
    let candidates = projects.map(proj => {
      let score = 0;
      // Score based on tech overlaps
      proj.technologies.forEach(tech => {
        if (empSkillNames.some(s => s.toLowerCase().includes(tech.toLowerCase()))) {
          score += 3;
        }
      });
      // Score based on domain alignment
      if (employee.domains.includes(proj.domain)) {
        score += 2;
      }
      return { project: proj, score };
    });

    // Sort by compatibility score
    candidates.sort((a, b) => b.score - a.score);

    // Pick top compatible projects
    const selectedProjects = candidates.slice(0, projectCount).map(c => c.project);

    // If for some reason we have fewer projects than needed, pad with random ones
    while (selectedProjects.length < projectCount) {
      const randProj = randomElement(projects);
      if (!selectedProjects.some(p => p.projectId === randProj.projectId)) {
        selectedProjects.push(randProj);
      }
    }

    // Populate employee's projects list
    employee.projects = selectedProjects.map(proj => {
      // Choose a realistic role in this project for the employee based on designation
      let roleInProj = 'Core Contributor';
      if (employee.designation === 'Engineering Manager') {
        roleInProj = 'Project Manager';
      } else if (employee.designation === 'Solution Architect') {
        roleInProj = 'Lead Architect';
      } else if (employee.designation === 'Technical Lead') {
        roleInProj = 'Technical Lead';
      } else {
        roleInProj = randomElement(rolesInProject.filter(r => r !== 'Lead Architect' && r !== 'Project Manager'));
      }

      // Generate realistic start and end dates relative to employee joining date
      const empJoinDate = new Date(employee.joiningDate);
      const today = new Date();
      
      let projStartDate = new Date(empJoinDate.getTime() + randomRange(1, 12) * 30 * 24 * 60 * 60 * 1000);
      if (projStartDate > today) {
        projStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let projEndDate = new Date(projStartDate.getTime() + randomRange(3, 12) * 30 * 24 * 60 * 60 * 1000);
      let isCurrent = false;

      if (projEndDate > today || proj.status === 'Active') {
        projEndDate = 'Present';
        isCurrent = true;
      } else {
        projEndDate = projEndDate.toISOString().split('T')[0];
      }

      return {
        projectId: proj.projectId,
        projectName: proj.projectName,
        role: roleInProj,
        description: proj.description,
        startDate: projStartDate.toISOString().split('T')[0],
        endDate: projEndDate,
        isCurrent
      };
    });
  });

  return projects;
}

module.exports = {
  generateProjects
};
