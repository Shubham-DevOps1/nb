import { Component, inject } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';
import { EmployeeDirectoryService } from '../employee-directory.service';

@Component({
  selector: 'app-employee-detail-panel',
  imports: [Icon],
  templateUrl: './employee-detail-panel.html',
  styleUrl: './employee-detail-panel.scss',
})
export class EmployeeDetailPanel {
  protected readonly service = inject(EmployeeDirectoryService);

  protected initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }
}
