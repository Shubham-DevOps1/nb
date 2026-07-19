import { Injectable, computed, inject, signal } from '@angular/core';
import { MatchedResource, RequirementAnalysisService } from '../requirement-analysis/requirement-analysis.service';

export interface ShortlistedMember {
  role: string;
  resource: MatchedResource;
}

export interface RoleReadiness {
  role: string;
  required: number;
  filled: number;
  headcountMet: boolean;
  missingSkills: string[];
  unavailableMembers: MatchedResource[];
  members: MatchedResource[];
}

@Injectable({ providedIn: 'root' })
export class TeamBuilderService {
  private readonly analysisService = inject(RequirementAnalysisService);

  readonly shortlist = signal<ShortlistedMember[]>([]);

  isShortlisted(employeeId: string, role: string): boolean {
    return this.shortlist().some(m => m.role === role && m.resource.employeeId === employeeId);
  }

  toggle(role: string, resource: MatchedResource): void {
    if (this.isShortlisted(resource.employeeId, role)) {
      this.shortlist.update(list => list.filter(m => !(m.role === role && m.resource.employeeId === resource.employeeId)));
    } else {
      this.shortlist.update(list => [...list, { role, resource }]);
    }
  }

  remove(role: string, employeeId: string): void {
    this.shortlist.update(list => list.filter(m => !(m.role === role && m.resource.employeeId === employeeId)));
  }

  clear(): void {
    this.shortlist.set([]);
  }

  /**
   * Per-role readiness, checked against the original requirement (headcount,
   * required skills) - not fabricated stats, just real gaps: which required
   * skills nobody shortlisted actually covers, and who isn't immediately
   * "Available" (a real flag, not a blocker - the caller decides whether an
   * "Allocated" pick starting later is still acceptable).
   */
  readonly readiness = computed<RoleReadiness[]>(() => {
    const requirements = this.analysisService.result()?.matches ?? [];
    const shortlist = this.shortlist();

    return requirements.map(req => {
      const members = shortlist.filter(m => m.role === req.role).map(m => m.resource);
      // matchedSkills only reflects primary-skill matches (see resourceMatcher.js's
      // scoreEmployee); matchedSkillDetails also credits secondary skills, which
      // already count toward this person's match score - using matchedSkills alone
      // under-counted real coverage and made teams look incomplete when they weren't.
      const coveredSkills = new Set(
        members.flatMap(m => m.matchedSkillDetails.filter(d => d.matched).map(d => d.name.toLowerCase()))
      );
      const missingSkills = req.skills.filter(s => !coveredSkills.has(s.toLowerCase()));
      const unavailableMembers = members.filter(m => m.availability.toLowerCase() !== 'available');

      return {
        role: req.role,
        required: req.count,
        filled: members.length,
        headcountMet: members.length >= req.count,
        missingSkills,
        unavailableMembers,
        members,
      };
    });
  });

  // "Ready" means every role has enough people assigned - the actual
  // deployment blocker. Missing-skill coverage is shown per role as an
  // advisory flag (e.g. "nobody shortlisted covers PostgreSQL"), not a hard
  // block - a fully-staffed team can still ship even if one nice-to-have
  // skill isn't individually covered by a specific member.
  readonly overallReady = computed(() =>
    this.readiness().length > 0 && this.readiness().every(r => r.headcountMet)
  );

  readonly teamStats = computed(() => {
    const allMembers = this.shortlist().map(m => m.resource);
    const totalHeadcount = allMembers.length;
    const avgExperience = totalHeadcount
      ? Math.round((allMembers.reduce((sum, m) => sum + m.experience, 0) / totalHeadcount) * 10) / 10
      : 0;
    const avgPerformance = totalHeadcount
      ? Math.round((allMembers.reduce((sum, m) => sum + m.performanceRating, 0) / totalHeadcount) * 10) / 10
      : 0;
    const availableNow = allMembers.filter(m => m.availability.toLowerCase() === 'available').length;

    return { totalHeadcount, avgExperience, avgPerformance, availableNow };
  });
}
