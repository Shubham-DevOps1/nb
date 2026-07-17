import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    '[class.app-badge--neutral]': "tone() === 'neutral'",
  },
})
export class Badge {
  readonly tone = input<'primary' | 'neutral'>('primary');
}
