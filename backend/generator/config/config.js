module.exports = {
  TOTAL_EMPLOYEES: 1000,

  // Organization distribution percentages (must sum to 1.0)
  ROLE_DISTRIBUTION: {
    'Engineering Manager': 0.10,
    'Solution Architect': 0.05,
    'Technical Lead': 0.15,
    'Senior Engineer': 0.30,
    'Software Engineer': 0.30,
    'Associate Engineer': 0.10
  },

  // Scaling ratios (relative to TOTAL_EMPLOYEES)
  CLIENTS_RATIO: 0.20,      // e.g., 20 clients for 100 employees
  PROJECTS_RATIO: 5.0,      // e.g., 500 projects for 100 employees
  CERTIFICATIONS_RATIO: 2.0,// e.g., 200 certifications for 100 employees
  
  // Span of control constraints for managers
  MIN_REPORTS: 6,
  MAX_REPORTS: 12
};
