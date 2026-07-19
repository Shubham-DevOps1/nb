import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SkillGapRow {
  skill: string;
  category: string;
  required: number;
  available: number;
  gap: number;
  gapPercentage: number;
}

export interface CategoryGap {
  category: string;
  required: number;
  available: number;
  gap: number;
  gapPercentage: number;
}

export interface RecommendedCapacity {
  category: string;
  additionalCapacityNeeded: number;
}

export interface SkillGapAnalysis {
  generatedAt: string;
  totalEmployees: number;
  demandProjectCount: number;
  topMissingSkills: SkillGapRow[];
  skillGapTable: SkillGapRow[];
  categoryGaps: CategoryGap[];
  recommendedCapacity: RecommendedCapacity[];
}

// Relative path - see requirement-analysis.service.ts for why (dev-server
// proxy, nginx reverse proxy, same-origin ALB all work unchanged).
const API_URL = '/api/intelligence/skill-gap';

@Injectable({ providedIn: 'root' })
export class SkillGapAnalysisService {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(false);
  readonly result = signal<SkillGapAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.http.get<SkillGapAnalysis>(API_URL));
      this.result.set(response);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message =
        httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to load skill gap analysis. Please try again.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
