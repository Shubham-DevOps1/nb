import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon/icon';
import { Card } from '../../../shared/ui/card/card';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { RequirementAnalysisService } from '../../requirement-analysis/requirement-analysis.service';
import { TeamBuilderService } from '../team-builder.service';

@Component({
  selector: 'app-team-builder-page',
  imports: [RouterLink, Icon, Card, EmptyState],
  templateUrl: './team-builder-page.html',
  styleUrl: './team-builder-page.scss',
})
export class TeamBuilderPage {
  protected readonly analysisService = inject(RequirementAnalysisService);
  protected readonly teamBuilder = inject(TeamBuilderService);

  protected initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }

  protected availabilityTone(availability: string): 'success' | 'warn' {
    return availability.toLowerCase() === 'available' ? 'success' : 'warn';
  }

  removeMember(role: string, employeeId: string): void {
    this.teamBuilder.remove(role, employeeId);
  }
}
