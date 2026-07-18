import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../shared/ui/icon/icon';
import { RequirementAnalysisService } from '../../requirement-analysis/requirement-analysis.service';

const DEBOUNCE_MS = 400;

@Component({
  selector: 'app-match-weights-panel',
  imports: [FormsModule, Icon],
  templateUrl: './match-weights-panel.html',
  styleUrl: './match-weights-panel.scss',
})
export class MatchWeightsPanel {
  private readonly analysisService = inject(RequirementAnalysisService);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly expanded = signal(false);

  // Defaults mirror the backend's DEFAULT_WEIGHTS (resourceMatcher.js) - the
  // fixed 50/25/25 split this whole feature makes adjustable.
  protected readonly skillFit = signal(50);
  protected readonly availabilityFit = signal(25);
  protected readonly deliveryTrackRecord = signal(25);

  protected readonly total = computed(() => this.skillFit() + this.availabilityFit() + this.deliveryTrackRecord());

  // Sliders needn't sum to 100 - shown normalized so users see the actual
  // contribution each weight has on the final score, matching what the
  // backend computes via normalizeWeights().
  protected readonly normalized = computed(() => {
    const total = this.total();
    if (total <= 0) return { skillFit: 0, availabilityFit: 0, deliveryTrackRecord: 0 };
    return {
      skillFit: Math.round((this.skillFit() / total) * 100),
      availabilityFit: Math.round((this.availabilityFit() / total) * 100),
      deliveryTrackRecord: Math.round((this.deliveryTrackRecord() / total) * 100),
    };
  });

  protected readonly isRematching = this.analysisService.isRematching;
  protected readonly rematchError = this.analysisService.rematchError;

  toggle(): void {
    this.expanded.update(v => !v);
  }

  onWeightChange(): void {
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.analysisService.rematch({
        skillFit: this.skillFit(),
        availabilityFit: this.availabilityFit(),
        deliveryTrackRecord: this.deliveryTrackRecord(),
      });
    }, DEBOUNCE_MS);
  }

  reset(): void {
    this.skillFit.set(50);
    this.availabilityFit.set(25);
    this.deliveryTrackRecord.set(25);
    this.onWeightChange();
  }
}
