import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationItem } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  getMine(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(this.API_URL);
  }

  markRead(id: string): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.API_URL}/${id}/read`, {});
  }

  markAllRead(): Observable<number> {
    return this.http.patch<number>(`${this.API_URL}/read-all`, {});
  }
}
