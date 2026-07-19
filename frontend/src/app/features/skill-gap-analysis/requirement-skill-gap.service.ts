import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RequirementMatch } from '../requirement-analysis/requirement-analysis.service';

export interface UpskillCandidate {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  experience: number;
  matchedOtherSkills: string[];
}

export interface SkillCoverageRow {
  skill: string;
  category: string;
  employeesWithSkill: number;
  needed: number;
  shortfall: number;
  upskillCandidates: UpskillCandidate[];
}

export interface RequirementSkillGap {
  role: string;
  count: number;
  minExperience: number;
  eligiblePoolSize: number;
  skillCoverage: SkillCoverageRow[];
}

const API_URL = '/api/intelligence/requirement-skill-gap';

@Injectable({ providedIn: 'root' })
export class RequirementSkillGapService {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(false);
  readonly result = signal<RequirementSkillGap | null>(null);
  readonly error = signal<string | null>(null);

  async load(requirement: RequirementMatch): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<RequirementSkillGap>(API_URL, {
          role: requirement.role,
          skills: requirement.skills,
          count: requirement.count,
          minExperience: requirement.minExperience,
        })
      );
      this.result.set(response);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message =
        httpErr?.error?.error ?? httpErr?.error?.message ?? 'Failed to load requirement skill gap. Please try again.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
