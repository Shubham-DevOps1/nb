import { Component, input } from '@angular/core';
import { Icon } from '../../shared/ui/icon/icon';
import { Button } from '../../shared/ui/button/button';

@Component({
  selector: 'app-top-bar',
  imports: [Icon, Button],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  readonly pageTitle = input.required<string>();
  readonly pageSubtitle = input<string | undefined>(undefined);
}
