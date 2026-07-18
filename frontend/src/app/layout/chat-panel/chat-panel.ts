import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../shared/ui/icon/icon';
import {
  ChatService,
  ResumeCandidate,
  SearchResultItem,
} from '../../features/chat/chat.service';

@Component({
  selector: 'app-chat-panel',
  imports: [Icon, FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  protected readonly chatService = inject(ChatService);

  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly pendingFileName = signal<string | null>(null);
  private pendingFile: File | null = null;
  protected messageText = '';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingFile = file;
      this.pendingFileName.set(file.name);
    }
  }

  clearFile(): void {
    this.pendingFile = null;
    this.pendingFileName.set(null);
    const input = this.fileInputRef()?.nativeElement;
    if (input) input.value = '';
  }

  async submit(): Promise<void> {
    const text = this.messageText.trim();
    const file = this.pendingFile;
    if (!text && !file) return;

    this.messageText = '';
    this.clearFile();
    await this.chatService.send(text, file);
  }

  protected isSearchResults(data: unknown): data is { results: SearchResultItem[] } {
    return !!data && Array.isArray((data as { results?: unknown }).results);
  }

  protected isResumeCandidates(data: unknown): data is { candidates: ResumeCandidate[]; answer: string } {
    return !!data && Array.isArray((data as { candidates?: unknown }).candidates);
  }

  protected isRequirementMatches(
    data: unknown,
  ): data is { sourceFile: string; requirementCount: number; matches: { role: string; matchedCount: number; count: number; sufficientResources: boolean }[] } {
    return !!data && Array.isArray((data as { matches?: unknown }).matches);
  }
}
