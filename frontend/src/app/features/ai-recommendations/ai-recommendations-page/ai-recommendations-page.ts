import { Component, computed, inject, signal } from '@angular/core';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { RequirementAnalysisService } from '../../requirement-analysis/requirement-analysis.service';
import { RequirementListPanel } from '../requirement-list-panel/requirement-list-panel';
import { CandidateMatchPanel } from '../candidate-match-panel/candidate-match-panel';
import { MatchWeightsPanel } from '../match-weights-panel/match-weights-panel';

@Component({
  selector: 'app-ai-recommendations-page',
  imports: [EmptyState, RequirementListPanel, CandidateMatchPanel, MatchWeightsPanel],
  templateUrl: './ai-recommendations-page.html',
  styleUrl: './ai-recommendations-page.scss',
})
export class AiRecommendationsPage {
  // Reuses the same singleton service Requirement Analysis writes to - this
  // page shows recommendations for whatever document was most recently
  // analyzed there, rather than requiring a separate upload step.
  protected readonly analysisService = inject(RequirementAnalysisService);

  protected readonly selectedIndex = signal(0);

  protected readonly matches = computed(() => this.analysisService.result()?.matches ?? []);

  protected readonly selectedMatch = computed(() => {
    const matches = this.matches();
    const index = this.selectedIndex();
    return matches[index] ?? matches[0] ?? null;
  });

  onSelect(index: number): void {
    this.selectedIndex.set(index);
  }
}
