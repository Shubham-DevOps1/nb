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
  LucideCircleCheck,
  LucideCircleAlert,
  LucideClock,
  LucideAward,
  LucideX,
  LucidePaperclip,
  LucideSend,
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
  | 'badge-check'
  | 'circle-check'
  | 'circle-alert'
  | 'clock'
  | 'award'
  | 'x'
  | 'paperclip'
  | 'send';

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
    LucideCircleCheck,
    LucideCircleAlert,
    LucideClock,
    LucideAward,
    LucideX,
    LucidePaperclip,
    LucideSend,
  ],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
