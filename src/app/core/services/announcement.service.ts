import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Announcement } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/announcements`;

  pending(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.url}/pending`).pipe(catchError(() => of([])));
  }

  dismiss(key: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${encodeURIComponent(key)}/dismiss`, {});
  }
}
