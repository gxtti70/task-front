import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthResponse, User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = 'http://localhost:8080/api/auth';

  // State Management nativo con Signals
  private _accessToken = signal<string | null>(localStorage.getItem('access_token'));
  private _currentUser = signal<User | null>(this.getSafeInitialUser());

  // Selectores Reactivos Públicos
  public accessToken = computed(() => this._accessToken());
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._accessToken());

  // 🔒 Función para parsear el localStorage de forma segura sin romper la app en el arranque
  private getSafeInitialUser(): User | null {
    const savedUser = localStorage.getItem('user');
    if (!savedUser || savedUser === 'null') return null;

    try {
      // Validamos si es un string que abre como JSON válido
      if (savedUser.startsWith('{') || savedUser.startsWith('[')) {
        return JSON.parse(savedUser);
      }
      return null;
    } catch (e) {
      console.error('⚠️ Estructura JSON de usuario corrupta en localStorage. Limpiando...', e);
      localStorage.removeItem('user');
      return null;
    }
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => this.setSession(res)),
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          console.warn('⚠️ Backend offline. Utilizando Mock Session para desarrollo fluido.');
          const mockRes: AuthResponse = {
            accessToken: 'mock-jwt-access-token-xyz',
            refreshToken: 'mock-jwt-refresh-token-abc',
            user: { id: '1', email: credentials.email, name: 'Santiago Muñoz', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
          };
          this.setSession(mockRes);
          return of(mockRes);
        }
        return throwError(() => err);
      })
    );
  }

  register(payload: { fullName: string; email: string; password: string; role: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, payload, { responseType: 'text' }).pipe(
      catchError(err => {
        if (err.status === 0 || err.status === 404) {
          console.warn('⚠️ Backend offline. Simulando registro exitoso en desarrollo.');
          return of('Usuario registrado exitosamente (Mock)');
        }
        return throwError(() => err);
      })
    );
  }

  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<any>(`${this.API_URL}/refresh`, { refreshToken: refresh }).pipe(
      tap(res => {
        this._accessToken.set(res.accessToken);
        localStorage.setItem('access_token', res.accessToken);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  private setSession(authRes: AuthResponse): void {
    this._accessToken.set(authRes.accessToken);
    this._currentUser.set(authRes.user);
    localStorage.setItem('access_token', authRes.accessToken);
    localStorage.setItem('refresh_token', authRes.refreshToken);
    localStorage.setItem('user', JSON.stringify(authRes.user));
  }
}