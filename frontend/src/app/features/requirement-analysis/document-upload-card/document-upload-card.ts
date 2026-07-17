import { Component, inject, signal } from '@angular/core';
import { Card } from '../../../shared/ui/card/card';
import { Icon } from '../../../shared/ui/icon/icon';
import { Button } from '../../../shared/ui/button/button';
import { UploadedFileItem, UploadedFile } from '../uploaded-file-item/uploaded-file-item';
import { RequirementAnalysisService } from '../requirement-analysis.service';

@Component({
  selector: 'app-document-upload-card',
  imports: [Card, Icon, Button, UploadedFileItem],
  templateUrl: './document-upload-card.html',
  styleUrl: './document-upload-card.scss',
})
export class DocumentUploadCard {
  protected readonly analysisService = inject(RequirementAnalysisService);

  protected readonly uploadedFile = signal<UploadedFile | null>(null);
  protected readonly isUploadComplete = signal(false);

  private rawFile: File | null = null;
  private progressTimer?: ReturnType<typeof setInterval>;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || file.type !== 'application/pdf') {
      return;
    }

    this.analysisService.reset();
    this.rawFile = file;
    this.isUploadComplete.set(false);
    this.uploadedFile.set({
      name: file.name,
      sizeLabel: this.formatSize(file.size),
      uploadedLabel: 'just now',
      progress: 0,
    });

    clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => {
      const current = this.uploadedFile();
      if (!current) return;

      const next = Math.min(current.progress + 20, 100);
      this.uploadedFile.set({ ...current, progress: next });

      if (next >= 100) {
        clearInterval(this.progressTimer);
        this.isUploadComplete.set(true);
      }
    }, 200);
  }

  onSubmit(): void {
    if (this.rawFile) {
      this.analysisService.analyze(this.rawFile);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
