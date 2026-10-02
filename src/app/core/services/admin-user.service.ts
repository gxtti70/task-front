import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminUser, UserRole } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth/admin`;

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.API_URL}/users`);
  }

  createUser(user: { fullName: string; email: string; password: string; role: UserRole }): Observable<AdminUser> {
    const params = new HttpParams().set('role', user.role);
    return this.http.post<AdminUser>(`${this.API_URL}/create-user`, {
      fullName: user.fullName,
      email: user.email,
      password: user.password
    }, { params });
  }

  updateUser(id: string, user: { role: UserRole; active: boolean }): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.API_URL}/users/${id}`, user);
  }

}
