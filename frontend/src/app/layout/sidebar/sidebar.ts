import { Component } from '@angular/core';
import { Icon, IconName } from '../../shared/ui/icon/icon';
import { Badge } from '../../shared/ui/badge/badge';
import { Avatar } from '../../shared/ui/avatar/avatar';

interface NavItem {
  label: string;
  icon: IconName;
  active?: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [Icon, Badge, Avatar],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly navSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Dashboard', icon: 'dashboard' },
        { label: 'Requirement Analysis', icon: 'requirement', active: true },
        { label: 'AI Recommendations', icon: 'sparkles', badge: 12 },
      ],
    },
    {
      title: 'Talent',
      items: [
        { label: 'Employee Directory', icon: 'users' },
        { label: 'Team Builder', icon: 'team' },
        { label: 'Knowledge Base', icon: 'knowledge-base' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Skill Gap Analysis', icon: 'skill-gap' },
        { label: 'Analytics', icon: 'analytics' },
        { label: 'Settings', icon: 'settings' },
      ],
    },
  ];

  protected readonly user = {
    initials: 'EV',
    name: 'Elena Vance',
    role: 'Engineering Director',
  };
}
