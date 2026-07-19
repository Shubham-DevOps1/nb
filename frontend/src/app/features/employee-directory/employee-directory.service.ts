import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface EmployeeListItem {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  experience: number;
  availability: string;
  performanceRating: number;
  topSkills: string[];
}

export interface EmployeeListResponse {
  total: number;
  page: number;
  pageSize: number;
  employees: EmployeeListItem[];
}

export interface SkillDetail {
  name: string;
  category: string;
  level: string;
  yearsOfExperience: number;
}

export interface Certification {
  name: string;
  issuingOrganisation: string;
  issueDate: string;
  credentialId: string;
}

export interface ProjectHistoryEntry {
  projectId: string;
  projectName: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface EmployeeDetail {
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  location: string;
  experience: number;
  joiningDate: string;
  availability: string;
  performanceRating: number;
  salaryBand: string;
  primarySkills: SkillDetail[];
  secondarySkills: SkillDetail[];
  domains: string[];
  certifications: Certification[];
  projects: ProjectHistoryEntry[];
  education: { degree: string; institution: string; passingYear: number };
  languages: string[];
  managerName: string;
  summary: string;
  knowledgeCard: string;
}

export interface EmployeeFilterOptions {
  departments: string[];
  designations: string[];
  availabilities: string[];
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  availability?: string;
  designation?: string;
  location?: string;
  skill?: string;
  minExperience?: number;
  maxExperience?: number;
  sortBy?: 'name' | 'experience' | 'performanceRating';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const LIST_API_URL = '/api/employees';
const FILTER_OPTIONS_API_URL = '/api/employees/filter-options';

@Injectable({ providedIn: 'root' })
export class EmployeeDirectoryService {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(false);
  readonly result = signal<EmployeeListResponse | null>(null);
  readonly error = signal<string | null>(null);

  readonly filterOptions = signal<EmployeeFilterOptions | null>(null);

  readonly selectedEmployee = signal<EmployeeDetail | null>(null);
  readonly isDetailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  async loadFilterOptions(): Promise<void> {
    if (this.filterOptions()) return;
    try {
      const options = await firstValueFrom(this.http.get<EmployeeFilterOptions>(FILTER_OPTIONS_API_URL));
      this.filterOptions.set(options);
    } catch {
      // Non-critical - filter dropdowns just stay empty if this fails.
    }
  }

  async list(filters: EmployeeFilters): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    try {
      const response = await firstValueFrom(this.http.get<EmployeeListResponse>(LIST_API_URL, { params }));
      this.result.set(response);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message = httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to load employees. Please try again.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async selectEmployee(employeeId: string): Promise<void> {
    this.isDetailLoading.set(true);
    this.detailError.set(null);
    this.selectedEmployee.set(null);

    try {
      const employee = await firstValueFrom(this.http.get<EmployeeDetail>(`${LIST_API_URL}/${employeeId}`));
      this.selectedEmployee.set(employee);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message = httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to load employee detail.';
      this.detailError.set(message);
    } finally {
      this.isDetailLoading.set(false);
    }
  }
}
