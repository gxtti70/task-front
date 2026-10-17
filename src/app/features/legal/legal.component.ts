import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LegalService, LegalVersions } from '../../core/services/legal.service';
import { LEGAL_DOCUMENTS, LegalDocument } from './legal-content';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal.component.html'
})
export class LegalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private legalService = inject(LegalService);

  readonly documents = Object.values(LEGAL_DOCUMENTS);
  doc!: LegalDocument;
  versions: LegalVersions | null = null;

  ngOnInit(): void {
    const key = this.route.snapshot.data['doc'] as string;
    this.doc = LEGAL_DOCUMENTS[key] ?? LEGAL_DOCUMENTS['terms'];
    this.legalService.getVersions().subscribe({
      next: versions => (this.versions = versions),
      error: () => (this.versions = null)
    });
  }

  get version(): string {
    return this.versions ? this.versions[this.doc.versionKey] : '—';
  }
}
