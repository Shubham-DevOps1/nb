import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { TopBar } from '../top-bar/top-bar';
import { AiAssistantFab } from '../ai-assistant-fab/ai-assistant-fab';
import { ChatPanel } from '../chat-panel/chat-panel';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, Sidebar, TopBar, AiAssistantFab, ChatPanel],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let child = this.route.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        return child?.snapshot.data ?? {};
      }),
    ),
    { initialValue: {} as Record<string, string> },
  );

  protected readonly pageTitle = () => this.routeData()['title'] ?? '';
  protected readonly pageSubtitle = () => this.routeData()['subtitle'];
}
