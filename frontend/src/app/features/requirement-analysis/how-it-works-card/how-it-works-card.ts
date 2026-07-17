import { Component } from '@angular/core';
import { Card } from '../../../shared/ui/card/card';

interface Step {
  order: number;
  text: string;
}

@Component({
  selector: 'app-how-it-works-card',
  imports: [Card],
  templateUrl: './how-it-works-card.html',
  styleUrl: './how-it-works-card.scss',
})
export class HowItWorksCard {
  protected readonly steps: Step[] = [
    { order: 1, text: 'Document parsed & chunked with layout-aware OCR' },
    { order: 2, text: 'Skills & entities extracted via NER + LLM' },
    { order: 3, text: 'Semantic embeddings generated for matching' },
    { order: 4, text: 'Confidence scored against 2,847 talent profiles' },
  ];
}
