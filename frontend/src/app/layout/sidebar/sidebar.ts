import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../../shared/ui/icon/icon';
import { Badge } from '../../shared/ui/badge/badge';
import { Avatar } from '../../shared/ui/avatar/avatar';

interface NavItem {
  label: string;
  icon: IconName;
  route?: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [Icon, Badge, Avatar, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly navSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Requirement Analysis', icon: 'requirement', route: '/requirement-analysis' },
        { label: 'AI Recommendations', icon: 'sparkles', route: '/recommendations' },
      ],
    },
    {
      title: 'Talent',
      items: [
        { label: 'Employee Directory', icon: 'users', route: '/employee-directory' },
        { label: 'Team Builder', icon: 'team', route: '/team-builder' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Skill Gap Analysis', icon: 'skill-gap', route: '/skill-gap-analysis' },
      ],
    },
  ];

  protected readonly user = {
    initials: 'EV',
    name: 'Elena Vance',
    role: 'Engineering Director',
  };
}
