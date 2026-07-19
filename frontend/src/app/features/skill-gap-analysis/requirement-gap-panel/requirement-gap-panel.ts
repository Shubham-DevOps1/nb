import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon/icon';
import { RequirementAnalysisService } from '../../requirement-analysis/requirement-analysis.service';
import { RequirementSkillGapService } from '../requirement-skill-gap.service';

@Component({
  selector: 'app-requirement-gap-panel',
  imports: [Icon, RouterLink],
  templateUrl: './requirement-gap-panel.html',
  styleUrl: './requirement-gap-panel.scss',
})
export class RequirementGapPanel {
  protected readonly analysisService = inject(RequirementAnalysisService);
  protected readonly gapService = inject(RequirementSkillGapService);

  // Reuses whatever document was last analyzed in Requirement Analysis,
  // same convention as the AI Recommendations page.
  protected readonly matches = computed(() => this.analysisService.result()?.matches ?? []);

  protected readonly selectedIndex = signal<number | null>(null);
  // Only one shortfall skill's upskill list open at a time, to keep the panel scannable.
  protected readonly expandedSkill = signal<string | null>(null);

  onSelectRequirement(indexStr: string): void {
    const index = Number(indexStr);
    if (!Number.isFinite(index) || index < 0) return;

    this.selectedIndex.set(index);
    this.expandedSkill.set(null);

    const requirement = this.matches()[index];
    if (requirement) this.gapService.load(requirement);
  }

  toggleExpanded(skill: string): void {
    this.expandedSkill.update(current => (current === skill ? null : skill));
  }
}
