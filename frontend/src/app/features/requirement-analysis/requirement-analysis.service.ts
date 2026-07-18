import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ScoreBreakdown {
  skillFit: number;
  availabilityFit: number;
  deliveryTrackRecord: number;
}

export interface MatchedSkillDetail {
  name: string;
  matched: boolean;
  isPrimary: boolean;
  level: string;
  yearsOfExperience: number;
  proficiencyScore: number;
}

export interface MatchedResource {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  availability: string;
  experience: number;
  performanceRating: number;
  matchedSkills: string[];
  matchedSkillDetails: MatchedSkillDetail[];
  domainMatch: boolean;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface SkillDetail {
  name: string;
  importance: 'Must have' | 'Important' | 'Nice to have';
  relevance: number;
}

export interface RequirementMatch {
  role: string;
  skills: string[];
  skillDetails: SkillDetail[];
  certifications: string[];
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

export interface MatchWeights {
  skillFit: number;
  availabilityFit: number;
  deliveryTrackRecord: number;
}

// Relative path - works unchanged behind the dev-server proxy (see
// proxy.conf.json), the frontend container's nginx reverse proxy in
// docker-compose, and same-origin ALB routing on ECS. A hardcoded
// absolute URL would only ever work on localhost.
const API_URL = '/api/requirements/analyze';
const REMATCH_API_URL = '/api/requirements/rematch';

@Injectable({ providedIn: 'root' })
export class RequirementAnalysisService {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(false);
  readonly result = signal<RequirementAnalysis | null>(null);
  readonly error = signal<string | null>(null);

  readonly isRematching = signal(false);
  readonly rematchError = signal<string | null>(null);

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

  /**
   * Re-scores the already-extracted requirements against the full candidate
   * pool with new weights, rather than re-uploading the source PDF - the
   * backend re-runs matchAllRequirements from scratch (see
   * requirements/rematch), so this reflects the true full-pool ranking, not
   * a client-side re-sort of an already-truncated top slice.
   */
  async rematch(weights: MatchWeights): Promise<void> {
    const current = this.result();
    if (!current || this.isRematching()) return;

    this.isRematching.set(true);
    this.rematchError.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ matches: RequirementMatch[] }>(REMATCH_API_URL, {
          requirements: current.matches,
          weights,
        })
      );
      this.result.set({ ...current, matches: response.matches });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message =
        httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to re-score matches. Please try again.';
      this.rematchError.set(message);
    } finally {
      this.isRematching.set(false);
    }
  }
}
