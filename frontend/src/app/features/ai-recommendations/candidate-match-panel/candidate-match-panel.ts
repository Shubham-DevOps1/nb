import { Component, inject, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';
import { Button } from '../../../shared/ui/button/button';
import { ProgressBar } from '../../../shared/ui/progress-bar/progress-bar';
import { MatchedResource, RequirementMatch } from '../../requirement-analysis/requirement-analysis.service';
import { TeamBuilderService } from '../../team-builder/team-builder.service';

@Component({
  selector: 'app-candidate-match-panel',
  imports: [Icon, Button, ProgressBar],
  templateUrl: './candidate-match-panel.html',
  styleUrl: './candidate-match-panel.scss',
})
export class CandidateMatchPanel {
  protected readonly teamBuilder = inject(TeamBuilderService);

  readonly match = input<RequirementMatch | null>(null);

  protected toggleShortlist(role: string, resource: MatchedResource): void {
    this.teamBuilder.toggle(role, resource);
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  protected availabilityTone(availability: string): 'success' | 'warn' | 'neutral' {
    const a = availability.toLowerCase();
    if (a === 'available') return 'success';
    if (a === 'allocated') return 'neutral';
    return 'warn';
  }

  /**
   * Composes an honest "why this match" note purely from real fields
   * (matched skills + domain overlap) - no fabricated evidence.
   */
  protected matchNote(resource: MatchedResource, match: RequirementMatch): string {
    const skillPart = `Matches ${resource.matchedSkills.join(' & ')}`;
    const domainPart = resource.domainMatch && match.domain ? `; has direct experience in ${match.domain}` : '';
    return skillPart + domainPart + '.';
  }
}
