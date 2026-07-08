const fs = require('fs-extra');
const path = require('path');
const config = require('./config/config');
const { generateEmployees } = require('./generators/employeeGenerator');
const { generateHierarchy } = require('./generators/hierarchyGenerator');
const { generateProjects } = require('./generators/projectGenerator');
const { generateCertifications } = require('./generators/certificationGenerator');
const { generateManagerReviews } = require('./generators/managerReviewGenerator');
const { generateResumes } = require('./generators/resumeGenerator');
const { generateKnowledgeCards } = require('./generators/knowledgeCardGenerator');
const { escapeSqlString } = require('./utils/helpers');

// Output paths
const outputDir = path.join(__dirname, 'output');

function validateDataset(employees, projects, reviews, resumes, cards) {
  console.log('\n================ DATASET VALIDATION ================');
  
  // 1. Employee Count Check
  const expectedCount = config.TOTAL_EMPLOYEES;
  console.log(`- Total Employees Generated: ${employees.length} (Expected: ${expectedCount})`);
  if (employees.length !== expectedCount) {
    console.warn(`[WARNING] Employee count mismatch: Got ${employees.length}, expected ${expectedCount}`);
  }

  // 2. Unique ID & Email Check
  const idSet = new Set();
  const emailSet = new Set();
  let duplicateIds = 0;
  let duplicateEmails = 0;

  employees.forEach(emp => {
    if (idSet.has(emp.employeeId)) duplicateIds++;
    if (emailSet.has(emp.email)) duplicateEmails++;
    idSet.add(emp.employeeId);
    emailSet.add(emp.email);
  });

  console.log(`- Unique IDs Check: ${duplicateIds === 0 ? 'PASSED' : `FAILED (${duplicateIds} duplicates)`}`);
  console.log(`- Unique Emails Check: ${duplicateEmails === 0 ? 'PASSED' : `FAILED (${duplicateEmails} duplicates)`}`);

  // 3. Manager Relationships Check
  let orphanEmployees = 0;
  let managerCountMap = {};
  let rootManagers = 0;

  employees.forEach(emp => {
    const isRoot = emp.managerId === '00000000-0000-0000-0000-000000000000' || !emp.managerId;
    if (isRoot) {
      rootManagers++;
    } else {
      const parentExists = employees.some(mgr => mgr.employeeId === emp.managerId);
      if (!parentExists) {
        orphanEmployees++;
      } else {
        managerCountMap[emp.managerId] = (managerCountMap[emp.managerId] || 0) + 1;
      }
    }
  });

  console.log(`- Root Managers Found: ${rootManagers} (Expected: 1 for tree structure)`);
  console.log(`- Invalid/Orphan Employees Check: ${orphanEmployees === 0 ? 'PASSED' : `FAILED (${orphanEmployees} orphans found)`}`);

  // 4. Span of Control Check (6-12 direct reports per manager)
  let spanViolations = 0;
  const managers = employees.filter(e => e.designation === 'Engineering Manager');
  
  managers.forEach(mgr => {
    // Total reports includes both manager reports and IC reports
    const reportsCount = employees.filter(e => e.managerId === mgr.employeeId).length;
    const isWithinSpan = reportsCount >= config.MIN_REPORTS && reportsCount <= config.MAX_REPORTS;
    if (!isWithinSpan) {
      spanViolations++;
      // We only log if there is a severe violation, but since the tree shapes itself, let's track it
    }
  });
  console.log(`- Manager Span of Control Violations (needs to be 6-12 reports): ${spanViolations} / ${managers.length}`);

  // 5. Project Assignment Check (2 to 6 projects per employee)
  let invalidProjectCount = 0;
  employees.forEach(emp => {
    const count = emp.projects.length;
    if (count < 2 || count > 6) {
      invalidProjectCount++;
    }
  });
  console.log(`- Employee Projects Span Check (2-6 per employee): ${invalidProjectCount === 0 ? 'PASSED' : `FAILED (${invalidProjectCount} violations)`}`);

  // 6. Certifications check
  console.log(`- Standalone Records Summary:`);
  console.log(`  * Client Count: ${new Set(projects.map(p => p.client)).size}`);
  console.log(`  * Project Count: ${projects.length}`);
  console.log(`  * Certifications Total: ${employees.reduce((sum, e) => sum + e.certifications.length, 0)}`);
  console.log(`  * Resume Count: ${resumes.length}`);
  console.log(`  * Manager Review Count: ${reviews.length}`);
  console.log(`  * Knowledge Card Count: ${cards.length}`);
  console.log('====================================================\n');
}

/**
 * Performs a topological sort of employees based on reporting hierarchy
 * so that managers are inserted before their direct reports in SQL.
 */
function sortEmployeesTopologically(employees) {
  const insertedIds = new Set();
  insertedIds.add('00000000-0000-0000-0000-000000000000');
  insertedIds.add('');

  const sorted = [];
  let remaining = [...employees];

  while (remaining.length > 0) {
    const nextBatch = remaining.filter(e => insertedIds.has(e.managerId));
    if (nextBatch.length === 0) {
      // Fallback to break circular loops (should not happen)
      sorted.push(...remaining);
      break;
    }
    sorted.push(...nextBatch);
    nextBatch.forEach(e => insertedIds.add(e.employeeId));
    remaining = remaining.filter(e => !insertedIds.has(e.employeeId));
  }

  return sorted;
}

function generateSqlFiles(employees, projects) {
  // Sort employees topologically to respect foreign key constraints during inserts
  const sortedEmployees = sortEmployeesTopologically(employees);

  // 1. DDL Schema Definition
  const ddl = `-- Database Schema DDL for TalentIQ AI Platform

DROP TABLE IF EXISTS project_technologies CASCADE;
DROP TABLE IF EXISTS employee_domains CASCADE;
DROP TABLE IF EXISTS employee_languages CASCADE;
DROP TABLE IF EXISTS employee_certifications CASCADE;
DROP TABLE IF EXISTS employee_projects CASCADE;
DROP TABLE IF EXISTS employee_skills CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    designation VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    experience INT NOT NULL,
    location VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    availability VARCHAR(50) NOT NULL,
    performance_rating DECIMAL(3,2) NOT NULL,
    salary_band VARCHAR(50) NOT NULL,
    manager_id UUID,
    summary TEXT NOT NULL,
    manager_feedback TEXT NOT NULL,
    knowledge_card TEXT NOT NULL,
    resume_json JSONB NOT NULL
);

CREATE TABLE projects (
    project_id UUID PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    client VARCHAR(100) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    budget NUMERIC(15,2) NOT NULL,
    description TEXT NOT NULL,
    project_complexity VARCHAR(20) NOT NULL,
    team_size INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    role VARCHAR(100) NOT NULL
);

CREATE TABLE employee_skills (
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50) NOT NULL,
    skill_level VARCHAR(50) NOT NULL,
    years_of_experience INT NOT NULL,
    PRIMARY KEY (employee_id, skill_name)
);

CREATE TABLE employee_projects (
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    role_in_project VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    is_current BOOLEAN NOT NULL,
    PRIMARY KEY (employee_id, project_id)
);

CREATE TABLE employee_certifications (
    certification_id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    issuing_organisation VARCHAR(150) NOT NULL,
    issue_date DATE NOT NULL,
    credential_id VARCHAR(50) NOT NULL
);

CREATE TABLE employee_languages (
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    PRIMARY KEY (employee_id, language)
);

CREATE TABLE employee_domains (
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    PRIMARY KEY (employee_id, domain)
);

CREATE TABLE project_technologies (
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    technology VARCHAR(100) NOT NULL,
    PRIMARY KEY (project_id, technology)
);

ALTER TABLE employees ADD CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id);
`;

  // 2. Generate Employees SQL inserts
  let employeesInserts = '-- Insert statements for table: employees\n';
  sortedEmployees.forEach(emp => {
    const isRoot = emp.managerId === '00000000-0000-0000-0000-000000000000' || !emp.managerId;
    const sqlManagerId = isRoot ? 'NULL' : `'${emp.managerId}'`;
    const resumeStr = JSON.stringify(emp.resumeJson);

    employeesInserts += `INSERT INTO employees (employee_id, name, email, designation, department, experience, location, joining_date, availability, performance_rating, salary_band, manager_id, summary, manager_feedback, knowledge_card, resume_json) VALUES (\n  '${emp.employeeId}',\n  '${escapeSqlString(emp.name)}',\n  '${escapeSqlString(emp.email)}',\n  '${escapeSqlString(emp.designation)}',\n  '${escapeSqlString(emp.department)}',\n  ${emp.experience},\n  '${escapeSqlString(emp.location)}',\n  '${emp.joiningDate}',\n  '${escapeSqlString(emp.availability)}',\n  ${emp.performanceRating},\n  '${escapeSqlString(emp.salaryBand)}',\n  ${sqlManagerId},\n  '${escapeSqlString(emp.summary)}',\n  '${escapeSqlString(emp.managerFeedback)}',\n  '${escapeSqlString(emp.knowledgeCard)}',\n  '${escapeSqlString(resumeStr)}'\n);\n`;
  });

  // 3. Generate Projects SQL inserts
  let projectsInserts = '-- Insert statements for table: projects\n';
  projects.forEach(p => {
    projectsInserts += `INSERT INTO projects (project_id, project_name, client, domain, duration, budget, description, project_complexity, team_size, status, role) VALUES (\n  '${p.projectId}',\n  '${escapeSqlString(p.projectName)}',\n  '${escapeSqlString(p.client)}',\n  '${escapeSqlString(p.domain)}',\n  '${escapeSqlString(p.duration)}',\n  ${p.budget},\n  '${escapeSqlString(p.description)}',\n  '${escapeSqlString(p.projectComplexity)}',\n  ${p.teamSize},\n  '${escapeSqlString(p.status)}',\n  '${escapeSqlString(p.role)}'\n);\n`;
  });

  // 4. Generate related tables inserts (skills, projects, certs, languages, domains, tech)
  let skillsInserts = '-- Insert statements for table: employee_skills\n';
  let empProjInserts = '-- Insert statements for table: employee_projects\n';
  let certsInserts = '-- Insert statements for table: employee_certifications\n';
  let langsInserts = '-- Insert statements for table: employee_languages\n';
  let domainsInserts = '-- Insert statements for table: employee_domains\n';
  let techInserts = '-- Insert statements for table: project_technologies\n';

  sortedEmployees.forEach(emp => {
    // Skills
    const allSkills = [...emp.primarySkills, ...emp.secondarySkills];
    allSkills.forEach(s => {
      skillsInserts += `INSERT INTO employee_skills (employee_id, skill_name, skill_category, skill_level, years_of_experience) VALUES ('${emp.employeeId}', '${escapeSqlString(s.name)}', '${escapeSqlString(s.category)}', '${escapeSqlString(s.level)}', ${s.yearsOfExperience});\n`;
    });

    // Employee Projects
    emp.projects.forEach(ep => {
      const endDateVal = ep.endDate === 'Present' ? 'Present' : ep.endDate;
      empProjInserts += `INSERT INTO employee_projects (employee_id, project_id, role_in_project, start_date, end_date, is_current) VALUES ('${emp.employeeId}', '${ep.projectId}', '${escapeSqlString(ep.role)}', '${ep.startDate}', '${escapeSqlString(endDateVal)}', ${ep.isCurrent});\n`;
    });

    // Certifications
    emp.certifications.forEach(c => {
      const certId = require('uuid').v4(); // Generate a PK for certification
      certsInserts += `INSERT INTO employee_certifications (certification_id, employee_id, name, issuing_organisation, issue_date, credential_id) VALUES ('${certId}', '${emp.employeeId}', '${escapeSqlString(c.name)}', '${escapeSqlString(c.issuingOrganisation)}', '${c.issueDate}', '${escapeSqlString(c.credentialId)}');\n`;
    });

    // Languages
    emp.languages.forEach(l => {
      langsInserts += `INSERT INTO employee_languages (employee_id, language) VALUES ('${emp.employeeId}', '${escapeSqlString(l)}');\n`;
    });

    // Domains
    emp.domains.forEach(d => {
      domainsInserts += `INSERT INTO employee_domains (employee_id, domain) VALUES ('${emp.employeeId}', '${escapeSqlString(d)}');\n`;
    });
  });

  projects.forEach(p => {
    p.technologies.forEach(t => {
      techInserts += `INSERT INTO project_technologies (project_id, technology) VALUES ('${p.projectId}', '${escapeSqlString(t)}');\n`;
    });
  });

  // Construct complete seed.sql
  const seedSql = `${ddl}
  
-- ==================== DATA SEEDING ====================

BEGIN;

${employeesInserts}

${projectsInserts}

${skillsInserts}

${empProjInserts}

${certsInserts}

${langsInserts}

${domainsInserts}

${techInserts}

COMMIT;
`;

  return {
    employeesSql: employeesInserts,
    projectsSql: projectsInserts,
    seedSql: seedSql
  };
}

function main() {
  console.log(`Starting Synthetic Enterprise Data Generator...`);
  console.log(`Target: ${config.TOTAL_EMPLOYEES} employees`);

  // 1. Ensure output directory exists
  fs.ensureDirSync(outputDir);

  // 2. Generate Dataset
  console.log('Generating base employee entities...');
  let employees = generateEmployees(config.TOTAL_EMPLOYEES);

  console.log('Building reporting hierarchy tree...');
  employees = generateHierarchy(employees);

  console.log('Generating projects and project assignments...');
  const projects = generateProjects(employees, config.TOTAL_EMPLOYEES);

  console.log('Assigning certifications based on personas...');
  employees = generateCertifications(employees, config.TOTAL_EMPLOYEES);

  console.log('Writing manager reviews...');
  const reviews = generateManagerReviews(employees);

  console.log('Structuring JSON resumes...');
  const resumes = generateResumes(employees);

  console.log('Synthesizing semantic knowledge cards...');
  const cards = generateKnowledgeCards(employees);

  // 3. Run validations
  validateDataset(employees, projects, reviews, resumes, cards);

  // 4. Write JSON outputs
  console.log('Writing JSON outputs to disk...');
  fs.writeJsonSync(path.join(outputDir, 'employees.json'), employees, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, 'projects.json'), projects, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, 'knowledgeCards.json'), cards, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, 'managerReviews.json'), reviews, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, 'resumes.json'), resumes, { spaces: 2 });

  // 5. Generate and write SQL outputs
  console.log('Generating SQL scripts...');
  const sqlData = generateSqlFiles(employees, projects);
  fs.writeFileSync(path.join(outputDir, 'employees.sql'), sqlData.employeesSql, 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'projects.sql'), sqlData.projectsSql, 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'seed.sql'), sqlData.seedSql, 'utf-8');

  console.log('\n[SUCCESS] Datasets generated successfully! Check output/ directory.');
  console.log(`Location: ${outputDir}\n`);
}

if (require.main === module) {
  main();
}
