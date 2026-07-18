import { Component, inject } from '@angular/core';
import { Icon } from '../../shared/ui/icon/icon';
import { ChatService } from '../../features/chat/chat.service';

@Component({
  selector: 'app-ai-assistant-fab',
  imports: [Icon],
  templateUrl: './ai-assistant-fab.html',
  styleUrl: './ai-assistant-fab.scss',
})
export class AiAssistantFab {
  protected readonly chatService = inject(ChatService);
}
