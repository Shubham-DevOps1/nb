import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    '[class.app-card--dashed]': "variant() === 'dashed'",
    '[class.app-card--flush]': '!padded()',
  },
})
export class Card {
  readonly variant = input<'default' | 'dashed'>('default');
  readonly padded = input(true);
}
