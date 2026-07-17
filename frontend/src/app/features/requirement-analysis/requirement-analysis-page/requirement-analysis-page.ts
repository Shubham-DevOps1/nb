import { Component } from '@angular/core';
import { DocumentUploadCard } from '../document-upload-card/document-upload-card';
import { HowItWorksCard } from '../how-it-works-card/how-it-works-card';
import { AnalysisResultsPanel } from '../analysis-results-panel/analysis-results-panel';

@Component({
  selector: 'app-requirement-analysis-page',
  imports: [DocumentUploadCard, HowItWorksCard, AnalysisResultsPanel],
  templateUrl: './requirement-analysis-page.html',
  styleUrl: './requirement-analysis-page.scss',
})
export class RequirementAnalysisPage {}
