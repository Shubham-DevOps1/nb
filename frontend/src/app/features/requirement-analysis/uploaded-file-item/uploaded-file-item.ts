import { Component, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar/progress-bar';

export interface UploadedFile {
  name: string;
  sizeLabel: string;
  uploadedLabel: string;
  progress: number;
}

@Component({
  selector: 'app-uploaded-file-item',
  imports: [Icon, ProgressBar],
  templateUrl: './uploaded-file-item.html',
  styleUrl: './uploaded-file-item.scss',
})
export class UploadedFileItem {
  readonly file = input.required<UploadedFile>();
}
