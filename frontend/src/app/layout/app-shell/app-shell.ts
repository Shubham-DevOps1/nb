import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { TopBar } from '../top-bar/top-bar';
import { AiAssistantFab } from '../ai-assistant-fab/ai-assistant-fab';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, Sidebar, TopBar, AiAssistantFab],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {}
