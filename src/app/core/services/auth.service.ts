import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthResponse, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  // State Management nativo con Signals
  private _accessToken = signal<string | null>(
    localStorage.getItem('access_token') || localStorage.getItem('token')
  );
  private _currentUser = signal<User | null>(this.getSafeInitialUser());

  // Selectores Reactivos Públicos
  public accessToken = computed(() => this._accessToken());
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._accessToken());

  // Selectores de Roles y Permisos leyendo directamente el token JWT para máxima seguridad
  public userRole = computed(() => {
    const token = this._accessToken();
    const savedRole = this._currentUser()?.role;
    if (!token) return savedRole?.replace(/^ROLE_/i, '').toUpperCase() || '';

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error('El token no contiene un payload JWT.');
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decodedPayload = JSON.parse(atob(paddedBase64));

      const claim = decodedPayload.role ?? decodedPayload.roles ?? decodedPayload.authorities;
      const role = Array.isArray(claim) ? claim[0] : claim;
      if (typeof role === 'string' && role.trim()) {
        return role.trim().replace(/^ROLE_/i, '').toUpperCase();
      }

      return 'DEVELOPER';
    } catch (e) {
      console.error('Error al decodificar el rol del token:', e);
      // Si hay token, no confiar en un rol persistido que podría pertenecer a una sesión anterior.
      return 'DEVELOPER';
    }
  });

  public isAdmin = computed(() => this.userRole() === 'ADMIN');

  public canManageTasks = computed(() => {
    const role = this.userRole();
    return role === 'ADMIN' || role === 'SCRUM' || role === 'MANAGER';
  });

  // 🔒 Función para parsear el localStorage de forma segura y normalizar el nombre
  private getSafeInitialUser(): User | null {
    const savedUser = localStorage.getItem('user');
    if (!savedUser || savedUser === 'null') return null;

    try {
      if (savedUser.startsWith('{') || savedUser.startsWith('[')) {
        const user = JSON.parse(savedUser);
        return {
          ...user,
          name: user.name || user.fullName || 'Usuario'
        };
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
        return throwError(() => err);
      })
    );
  }

  register(payload: { fullName: string; email: string; password: string }): Observable<string> {
    return this.http.post(`${this.API_URL}/register`, payload, { responseType: 'text' }).pipe(
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  refreshToken(): Observable<{ accessToken: string }> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<{ accessToken: string }>(`${this.API_URL}/refresh`, { refreshToken: refresh }).pipe(
      tap(res => {
        this._accessToken.set(res.accessToken);
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('token', res.accessToken);
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
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  private setSession(authRes: AuthResponse): void {
    const token = authRes.accessToken;
    this._accessToken.set(token);

    // Normalizamos el usuario recibido del backend para que 'name' nunca esté vacío
    const rawUser: User = authRes.user || { id: authRes.userId, email: authRes.email, role: authRes.role };
    const normalizedUser: User = {
      ...rawUser,
      email: rawUser.email || authRes.email,
      role: rawUser.role || authRes.role,
      name: rawUser.name || rawUser.fullName || authRes.email?.split('@')[0] || 'Usuario'
    };

    this._currentUser.set(normalizedUser);

    localStorage.setItem('access_token', token);
    localStorage.setItem('token', token);
    if (authRes.refreshToken) {
      localStorage.setItem('refresh_token', authRes.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  }
}
