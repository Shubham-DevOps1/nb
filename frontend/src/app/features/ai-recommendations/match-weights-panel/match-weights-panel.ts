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
  // fixed 40/20/20/20 split this whole feature makes adjustable.
  protected readonly skillFit = signal(40);
  protected readonly availabilityFit = signal(20);
  protected readonly deliveryTrackRecord = signal(20);
  protected readonly domainCertFit = signal(20);

  protected readonly total = computed(
    () => this.skillFit() + this.availabilityFit() + this.deliveryTrackRecord() + this.domainCertFit()
  );

  // Sliders needn't sum to 100 - shown normalized so users see the actual
  // contribution each weight has on the final score, matching what the
  // backend computes via normalizeWeights().
  protected readonly normalized = computed(() => {
    const total = this.total();
    if (total <= 0) return { skillFit: 0, availabilityFit: 0, deliveryTrackRecord: 0, domainCertFit: 0 };
    return {
      skillFit: Math.round((this.skillFit() / total) * 100),
      availabilityFit: Math.round((this.availabilityFit() / total) * 100),
      deliveryTrackRecord: Math.round((this.deliveryTrackRecord() / total) * 100),
      domainCertFit: Math.round((this.domainCertFit() / total) * 100),
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
        domainCertFit: this.domainCertFit(),
      });
    }, DEBOUNCE_MS);
  }

  reset(): void {
    this.skillFit.set(40);
    this.availabilityFit.set(20);
    this.deliveryTrackRecord.set(20);
    this.domainCertFit.set(20);
    this.onWeightChange();
  }
}
