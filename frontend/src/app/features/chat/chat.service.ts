import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SearchResultItem {
  employeeId: string;
  name: string;
  businessScore: number;
  reason: string;
  designation: string;
  department: string;
  experience: number;
  availability: string;
}

export interface ResumeCandidate {
  employeeId: string;
  name: string;
  matchScore: number;
  matchedChunkCount: number;
}

export type ChatToolData =
  | { results: SearchResultItem[] }
  | { question: string; candidates: ResumeCandidate[]; answer: string }
  | { sourceFile: string; requirementCount: number; matches: unknown[] }
  | null;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  text: string;
  toolUsed?: string | null;
  data?: ChatToolData;
  attachedFileName?: string;
}

interface ChatResponse {
  sessionId: string;
  reply: string;
  toolUsed: string | null;
  data: ChatToolData;
}

const SESSION_STORAGE_KEY = 'talentiq_chat_session_id';
const API_URL = '/api/chat';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private sessionId: string | null = localStorage.getItem(SESSION_STORAGE_KEY);

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly messages = signal<ChatMessage[]>([]);

  toggle(): void {
    this.isOpen.update(open => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async send(text: string, file: File | null): Promise<void> {
    if (this.isLoading()) return;
    if (!text && !file) return;

    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', text: text || `📎 ${file?.name}`, attachedFileName: file?.name },
    ]);
    this.isLoading.set(true);

    const formData = new FormData();
    if (this.sessionId) formData.append('sessionId', this.sessionId);
    if (text) formData.append('message', text);
    if (file) formData.append('document', file);

    try {
      const response = await firstValueFrom(this.http.post<ChatResponse>(API_URL, formData));
      this.sessionId = response.sessionId;
      localStorage.setItem(SESSION_STORAGE_KEY, response.sessionId);
      this.messages.update(msgs => [
        ...msgs,
        { role: 'assistant', text: response.reply, toolUsed: response.toolUsed, data: response.data },
      ]);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message = httpErr?.error?.message ?? httpErr?.error?.error ?? 'Something went wrong. Please try again.';
      this.messages.update(msgs => [...msgs, { role: 'error', text: message }]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
