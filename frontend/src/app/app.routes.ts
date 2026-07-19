import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'requirement-analysis',
    pathMatch: 'full',
  },
  {
    path: 'requirement-analysis',
    loadComponent: () =>
      import('./features/requirement-analysis/requirement-analysis-page/requirement-analysis-page').then(
        (m) => m.RequirementAnalysisPage,
      ),
    data: {
      title: 'Client Requirement Analysis',
      subtitle: 'Upload a client brief and let AI extract skills, scope, and confidence',
    },
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./features/ai-recommendations/ai-recommendations-page/ai-recommendations-page').then(
        (m) => m.AiRecommendationsPage,
      ),
    data: {
      title: 'AI Recommendations',
      subtitle: 'Semantic matches ranked by fit, availability, and past performance',
    },
  },
  {
    path: 'employee-directory',
    loadComponent: () =>
      import('./features/employee-directory/employee-directory-page/employee-directory-page').then(
        (m) => m.EmployeeDirectoryPage,
      ),
    data: {
      title: 'Employee Directory',
      subtitle: 'Browse and filter the full workforce',
    },
  },
  {
    path: 'team-builder',
    loadComponent: () =>
      import('./features/team-builder/team-builder-page/team-builder-page').then(
        (m) => m.TeamBuilderPage,
      ),
    data: {
      title: 'Team Builder',
      subtitle: 'Assemble a team from shortlisted candidates and check its readiness',
    },
  },
  {
    path: 'skill-gap-analysis',
    loadComponent: () =>
      import('./features/skill-gap-analysis/skill-gap-analysis-page/skill-gap-analysis-page').then(
        (m) => m.SkillGapAnalysisPage,
      ),
    data: {
      title: 'Skill Gap Analysis',
      subtitle: 'Skill supply vs. active and upcoming project demand',
    },
  },
];
