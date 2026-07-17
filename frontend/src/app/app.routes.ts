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
  },
];
