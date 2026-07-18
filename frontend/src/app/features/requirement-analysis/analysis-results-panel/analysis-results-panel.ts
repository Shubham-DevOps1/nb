import { Component, inject } from '@angular/core';
import { Card } from '../../../shared/ui/card/card';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { RequirementAnalysisService } from '../requirement-analysis.service';
import { CandidateMatchPanel } from '../../ai-recommendations/candidate-match-panel/candidate-match-panel';

@Component({
  selector: 'app-analysis-results-panel',
  imports: [Card, EmptyState, CandidateMatchPanel],
  templateUrl: './analysis-results-panel.html',
  styleUrl: './analysis-results-panel.scss',
})
export class AnalysisResultsPanel {
  protected readonly analysisService = inject(RequirementAnalysisService);
}
