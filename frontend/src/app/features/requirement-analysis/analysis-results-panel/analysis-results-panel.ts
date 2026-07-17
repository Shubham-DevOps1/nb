import { Component, inject } from '@angular/core';
import { Card } from '../../../shared/ui/card/card';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { RequirementAnalysisService } from '../requirement-analysis.service';

@Component({
  selector: 'app-analysis-results-panel',
  imports: [Card, EmptyState],
  templateUrl: './analysis-results-panel.html',
  styleUrl: './analysis-results-panel.scss',
})
export class AnalysisResultsPanel {
  protected readonly analysisService = inject(RequirementAnalysisService);
}
