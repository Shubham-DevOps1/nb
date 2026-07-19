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
