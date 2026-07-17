import { Component, input } from '@angular/core';
import {
  LucideLayoutGrid,
  LucideFileText,
  LucideSparkles,
  LucideUsers,
  LucideShare2,
  LucideBookOpen,
  LucideGauge,
  LucideChartColumn,
  LucideSettings,
  LucideCircleQuestionMark,
  LucideChevronDown,
  LucideSearch,
  LucideBell,
  LucidePlus,
  LucideCloudUpload,
  LucideFile,
  LucideBadgeCheck,
} from '@lucide/angular';

export type IconName =
  | 'dashboard'
  | 'requirement'
  | 'sparkles'
  | 'users'
  | 'team'
  | 'knowledge-base'
  | 'skill-gap'
  | 'analytics'
  | 'settings'
  | 'help'
  | 'chevron-down'
  | 'search'
  | 'bell'
  | 'plus'
  | 'upload'
  | 'file'
  | 'badge-check';

@Component({
  selector: 'app-icon',
  imports: [
    LucideLayoutGrid,
    LucideFileText,
    LucideSparkles,
    LucideUsers,
    LucideShare2,
    LucideBookOpen,
    LucideGauge,
    LucideChartColumn,
    LucideSettings,
    LucideCircleQuestionMark,
    LucideChevronDown,
    LucideSearch,
    LucideBell,
    LucidePlus,
    LucideCloudUpload,
    LucideFile,
    LucideBadgeCheck,
  ],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
