import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../shared/ui/icon/icon';
import { EmployeeDirectoryService } from '../employee-directory.service';

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 350;

@Component({
  selector: 'app-employee-list-panel',
  imports: [FormsModule, Icon],
  templateUrl: './employee-list-panel.html',
  styleUrl: './employee-list-panel.scss',
})
export class EmployeeListPanel implements OnInit {
  protected readonly service = inject(EmployeeDirectoryService);

  protected readonly search = signal('');
  protected readonly department = signal('');
  protected readonly availability = signal('');
  protected readonly skill = signal('');
  protected readonly page = signal(1);
  protected readonly selectedId = signal<string | null>(null);

  private debounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly totalPages = computed(() => {
    const result = this.service.result();
    return result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  });

  ngOnInit(): void {
    this.service.loadFilterOptions();
    this.fetch();
  }

  onFilterChange(): void {
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.page.set(1);
      this.fetch();
    }, DEBOUNCE_MS);
  }

  onDropdownChange(): void {
    this.page.set(1);
    this.fetch();
  }

  goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.fetch();
  }

  selectEmployee(employeeId: string): void {
    this.selectedId.set(employeeId);
    this.service.selectEmployee(employeeId);
  }

  private fetch(): void {
    this.service.list({
      search: this.search() || undefined,
      department: this.department() || undefined,
      availability: this.availability() || undefined,
      skill: this.skill() || undefined,
      page: this.page(),
      pageSize: PAGE_SIZE,
    });
  }

  protected availabilityTone(availability: string): 'success' | 'warn' {
    return availability.toLowerCase() === 'available' ? 'success' : 'warn';
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }
}
