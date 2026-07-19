import { Component, OnInit, inject } from '@angular/core';
import { Card } from '../../../shared/ui/card/card';
import { Icon } from '../../../shared/ui/icon/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar/progress-bar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { SkillGapAnalysisService } from '../skill-gap-analysis.service';
import { RequirementGapPanel } from '../requirement-gap-panel/requirement-gap-panel';

@Component({
  selector: 'app-skill-gap-analysis-page',
  imports: [Card, Icon, ProgressBar, EmptyState, RequirementGapPanel],
  templateUrl: './skill-gap-analysis-page.html',
  styleUrl: './skill-gap-analysis-page.scss',
})
export class SkillGapAnalysisPage implements OnInit {
  protected readonly service = inject(SkillGapAnalysisService);

  ngOnInit(): void {
    this.service.load();
  }

  /**
   * Two tiers, not three - the design system only has success/danger
   * semantic colors defined (no amber), so severity is: any real gap is
   * danger, no gap is success, rather than inventing a third color.
   */
  protected severityClass(gapPercentage: number): 'danger' | 'success' {
    return gapPercentage > 0 ? 'danger' : 'success';
  }

  /**
   * Bar length relative to the largest gap in this list, not gapPercentage -
   * the list is ranked by absolute gap (see skillGapAnalyzer.js), so the bar
   * needs to scale with the same thing being ranked. Using gapPercentage
   * here would make bars non-monotonic (a lower-ranked row could show a
   * longer bar than the row above it, since a small, fully-uncovered skill
   * hits 100% while a much bigger shortfall might only be 88%).
   */
  protected relativeGapBar(gap: number): number {
    const maxGap = Math.max(...this.service.result()?.topMissingSkills.map(r => r.gap) ?? [1]);
    return maxGap > 0 ? Math.round((gap / maxGap) * 100) : 0;
  }
}
