import { Component, input, output } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';
import { RequirementMatch } from '../../requirement-analysis/requirement-analysis.service';

@Component({
  selector: 'app-requirement-list-panel',
  imports: [Icon],
  templateUrl: './requirement-list-panel.html',
  styleUrl: './requirement-list-panel.scss',
})
export class RequirementListPanel {
  readonly matches = input.required<RequirementMatch[]>();
  readonly selectedIndex = input.required<number>();
  readonly select = output<number>();
}
