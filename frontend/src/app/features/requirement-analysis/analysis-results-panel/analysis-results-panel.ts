import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../../../shared/ui/card/card';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../shared/ui/icon/icon';
import { RequirementAnalysisService, SkillDetail } from '../requirement-analysis.service';

const IMPORTANCE_RANK: Record<SkillDetail['importance'], number> = {
  'Must have': 0,
  Important: 1,
  'Nice to have': 2,
};

@Component({
  selector: 'app-analysis-results-panel',
  imports: [Card, EmptyState, Icon, RouterLink],
  templateUrl: './analysis-results-panel.html',
  styleUrl: './analysis-results-panel.scss',
})
export class AnalysisResultsPanel {
  protected readonly analysisService = inject(RequirementAnalysisService);

  private readonly matches = computed(() => this.analysisService.result()?.matches ?? []);

  // Aggregates across every extracted role, not per-role - this summary
  // screen shows one combined picture of the whole document; per-role detail
  // lives on AI Recommendations.
  protected readonly totalTeamSize = computed(() => this.matches().reduce((sum, m) => sum + m.count, 0));

  protected readonly maxExperience = computed(() => {
    const values = this.matches().map(m => m.minExperience);
    return values.length ? Math.max(...values) : 0;
  });

  // Dedupes skills that appear in multiple roles, keeping the higher
  // relevance score and the more critical importance tier seen for it.
  protected readonly combinedSkills = computed<SkillDetail[]>(() => {
    const byName = new Map<string, SkillDetail>();
    for (const match of this.matches()) {
      for (const detail of match.skillDetails) {
        const existing = byName.get(detail.name);
        if (!existing) {
          byName.set(detail.name, detail);
        } else if (
          detail.relevance > existing.relevance ||
          IMPORTANCE_RANK[detail.importance] < IMPORTANCE_RANK[existing.importance]
        ) {
          byName.set(detail.name, {
            name: detail.name,
            importance:
              IMPORTANCE_RANK[detail.importance] < IMPORTANCE_RANK[existing.importance]
                ? detail.importance
                : existing.importance,
            relevance: Math.max(detail.relevance, existing.relevance),
          });
        }
      }
    }
    return Array.from(byName.values()).sort((a, b) => b.relevance - a.relevance);
  });

  protected readonly combinedCertifications = computed(() => {
    const set = new Set<string>();
    for (const match of this.matches()) {
      for (const cert of match.certifications) set.add(cert);
    }
    return Array.from(set);
  });

  // Unique people across all roles' matched resources - real, computed from
  // actual returned records (not a fabricated single "confidence" number).
  protected readonly totalCandidates = computed(() => {
    const ids = new Set<string>();
    for (const match of this.matches()) {
      for (const resource of match.resources) ids.add(resource.employeeId);
    }
    return ids.size;
  });
}
