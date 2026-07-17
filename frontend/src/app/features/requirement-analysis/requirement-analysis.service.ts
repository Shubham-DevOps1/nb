import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MatchedResource {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  availability: string;
  experience: number;
  matchedSkills: string[];
  domainMatch: boolean;
}

export interface RequirementMatch {
  role: string;
  skills: string[];
  domain: string | null;
  minExperience: number;
  count: number;
  justification: string;
  matchedCount: number;
  sufficientResources: boolean;
  resources: MatchedResource[];
}

export interface RequirementAnalysis {
  sourceFile: string;
  requirementCount: number;
  matches: RequirementMatch[];
}

// Relative path - works unchanged behind the dev-server proxy (see
// proxy.conf.json), the frontend container's nginx reverse proxy in
// docker-compose, and same-origin ALB routing on ECS. A hardcoded
// absolute URL would only ever work on localhost.
const API_URL = '/api/requirements/analyze';

@Injectable({ providedIn: 'root' })
export class RequirementAnalysisService {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(false);
  readonly result = signal<RequirementAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  reset(): void {
    this.result.set(null);
    this.error.set(null);
  }

  async analyze(file: File): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.result.set(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await firstValueFrom(this.http.post<RequirementAnalysis>(API_URL, formData));
      this.result.set(response);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message =
        httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to analyze document. Please try again.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
