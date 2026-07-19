const { loadJsonFile } = require('../utils/fileLoader');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

let cache = null;

function getAllEmployees() {
  if (!cache) cache = loadJsonFile('employees.json');
  return cache;
}

function matchesFilters(emp, filters) {
  const { search, department, availability, designation, location, skill, minExperience, maxExperience } = filters;

  if (search && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
  if (department && emp.department !== department) return false;
  if (availability && emp.availability !== availability) return false;
  if (designation && emp.designation !== designation) return false;
  if (location && !emp.location.toLowerCase().includes(location.toLowerCase())) return false;
  if (minExperience != null && emp.experience < minExperience) return false;
  if (maxExperience != null && emp.experience > maxExperience) return false;

  if (skill) {
    const lower = skill.toLowerCase();
    const allSkills = [...(emp.primarySkills || []), ...(emp.secondarySkills || [])];
    if (!allSkills.some(s => s.name.toLowerCase().includes(lower))) return false;
  }

  return true;
}

function compareEmployees(a, b, sortBy, sortDir) {
  const dir = sortDir === 'desc' ? -1 : 1;
  if (sortBy === 'experience') return (a.experience - b.experience) * dir;
  if (sortBy === 'performanceRating') return (a.performanceRating - b.performanceRating) * dir;
  return a.name.localeCompare(b.name) * dir;
}

function toListItem(emp) {
  const topSkills = (emp.primarySkills || []).slice(0, 4).map(s => s.name);
  return {
    employeeId: emp.employeeId,
    name: emp.name,
    designation: emp.designation,
    department: emp.department,
    location: emp.location,
    experience: emp.experience,
    availability: emp.availability,
    performanceRating: emp.performanceRating,
    topSkills,
  };
}

/**
 * Plain browse/filter/paginate over the full workforce - deliberately not a
 * semantic query. /api/search answers "who best fits this need"; this
 * answers "show me everyone in Cloud Solutions Group, available now."
 */
function listEmployees(query) {
  const all = getAllEmployees();

  const filters = {
    search: query.search || undefined,
    department: query.department || undefined,
    availability: query.availability || undefined,
    designation: query.designation || undefined,
    location: query.location || undefined,
    skill: query.skill || undefined,
    minExperience: query.minExperience != null ? Number(query.minExperience) : undefined,
    maxExperience: query.maxExperience != null ? Number(query.maxExperience) : undefined,
  };

  const sortBy = ['experience', 'performanceRating', 'name'].includes(query.sortBy) ? query.sortBy : 'name';
  const sortDir = query.sortDir === 'desc' ? 'desc' : 'asc';

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE));

  const filtered = all.filter(emp => matchesFilters(emp, filters)).sort((a, b) => compareEmployees(a, b, sortBy, sortDir));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize).map(toListItem);

  return { total, page, pageSize, employees: pageItems };
}

/**
 * Distinct department/designation/availability/location values actually
 * present in the data, so a directory filter UI can offer real dropdown
 * options rather than a free-text guess.
 */
function getFilterOptions() {
  const all = getAllEmployees();
  const departments = new Set();
  const designations = new Set();
  const availabilities = new Set();

  all.forEach(emp => {
    departments.add(emp.department);
    designations.add(emp.designation);
    availabilities.add(emp.availability);
  });

  return {
    departments: Array.from(departments).sort(),
    designations: Array.from(designations).sort(),
    availabilities: Array.from(availabilities).sort(),
  };
}

/**
 * Full detail record for one employee. Omits managerFeedback (performance
 * review commentary - not appropriate to surface in a general directory
 * without real access-control in place) and resumeJson (redundant raw data
 * already captured in the structured fields below).
 */
function getEmployeeById(employeeId) {
  const all = getAllEmployees();
  const emp = all.find(e => e.employeeId === employeeId);
  if (!emp) return null;

  return {
    employeeId: emp.employeeId,
    name: emp.name,
    email: emp.email,
    designation: emp.designation,
    department: emp.department,
    location: emp.location,
    experience: emp.experience,
    joiningDate: emp.joiningDate,
    availability: emp.availability,
    performanceRating: emp.performanceRating,
    salaryBand: emp.salaryBand,
    primarySkills: emp.primarySkills,
    secondarySkills: emp.secondarySkills,
    domains: emp.domains,
    certifications: emp.certifications,
    projects: emp.projects,
    education: emp.education,
    languages: emp.languages,
    managerName: emp.managerName,
    summary: emp.summary,
    knowledgeCard: emp.knowledgeCard,
  };
}

module.exports = { listEmployees, getFilterOptions, getEmployeeById };
