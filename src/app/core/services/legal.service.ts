import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Versiones legales vigentes y datos del responsable del tratamiento. */
export interface LegalVersions {
  termsVersion: string;
  privacyVersion: string;
  cookiesVersion: string;
  effectiveDate: string;
  controllerName: string;
  controllerTaxId: string;
  controllerAddress: string;
  privacyEmail: string;
}

@Injectable({ providedIn: 'root' })
export class LegalService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/legal`;

  /** Fuente única de verdad: la comparten las páginas legales y el registro. */
  getVersions(): Observable<LegalVersions> {
    return this.http.get<LegalVersions>(`${this.API_URL}/versions`);
  }
}
