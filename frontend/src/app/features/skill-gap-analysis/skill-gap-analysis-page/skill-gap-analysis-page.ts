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
}
