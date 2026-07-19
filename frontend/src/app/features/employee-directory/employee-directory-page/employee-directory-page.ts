import { Component } from '@angular/core';
import { EmployeeListPanel } from '../employee-list-panel/employee-list-panel';
import { EmployeeDetailPanel } from '../employee-detail-panel/employee-detail-panel';
import { Card } from '../../../shared/ui/card/card';

@Component({
  selector: 'app-employee-directory-page',
  imports: [EmployeeListPanel, EmployeeDetailPanel, Card],
  templateUrl: './employee-directory-page.html',
  styleUrl: './employee-directory-page.scss',
})
export class EmployeeDirectoryPage {}
