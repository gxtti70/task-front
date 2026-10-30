import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { tap, catchError, finalize, shareReplay, map, switchMap } from 'rxjs/operators';
import { AuthResponse, ProfileUpdateRequest, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private refreshInFlight: Observable<void> | null = null;
  private csrfInFlight: Observable<string> | null = null;

  // State Management nativo con Signals
  private _currentUser = signal<User | null>(null);
  readonly isLoggingOut = signal(false);

  constructor() {
    // Remove credentials persisted by versions that used localStorage.
    for (const key of ['access_token', 'token', 'refresh_token', 'user']) localStorage.removeItem(key);
  }

  // Selectores Reactivos Públicos
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._currentUser());

  // Role comes only from the authenticated /me response.
  public userRole = computed(() => this._currentUser()?.role?.replace(/^ROLE_/i, '').toUpperCase() || '');

  public isAdmin = computed(() => this.userRole() === 'ADMIN');

  public canManageTasks = computed(() => {
    const role = this.userRole();
    return role === 'ADMIN' || role === 'SCRUM' || role === 'MANAGER';
  });

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials, { withCredentials: true }).pipe(
      switchMap(res => this.loadProfile().pipe(map(() => res))),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  /** Starts the backend-managed Google OAuth flow. The backend must establish
   * the same HttpOnly cookie session used by password login before redirecting
   * to /auth/google/callback.
   */
  loginWithGoogle(): void {
    window.location.assign(`${this.API_URL}/google/authorize`);
  }

  prepareGoogleRegistration(consent: { acceptTerms: true; acceptPrivacy: true; termsVersion: string; privacyVersion: string }): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/google/consent`, consent, { withCredentials: true });
  }

  loadProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`, { withCredentials: true }).pipe(
      tap(profile => this.setCurrentProfile(profile))
    );
  }

  updateProfile(profile: ProfileUpdateRequest): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/me`, profile, { withCredentials: true }).pipe(
      tap(profile => this.setCurrentProfile(profile))
    );
  }

  private setCurrentProfile(profile: User): void {
    const user = {
      ...(this._currentUser() ?? {}),
      ...profile,
      name: profile.fullName || profile.name || 'Usuario',
      avatarUrl: profile.avatarData || undefined
    } as User;
    this._currentUser.set(user);
  }

  register(payload: {
    fullName: string;
    email: string;
    password: string;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
    termsVersion: string;
    privacyVersion: string;
  }): Observable<string> {
    return this.http.post(`${this.API_URL}/register`, payload, { responseType: 'text' }).pipe(
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  forgotPassword(email: string): Observable<string> {
    return this.http.post<{ message: string }>(`${this.API_URL}/forgot-password`, { email }).pipe(
      map(res => res.message),
      catchError(err => throwError(() => err))
    );
  }

  resetPassword(token: string, password: string): Observable<string> {
    return this.http.post<{ message: string }>(`${this.API_URL}/reset-password`, { token, password }).pipe(
      map(res => res.message),
      tap(() => this.clearSession()),
      catchError(err => throwError(() => err))
    );
  }

  ensureCsrf(): Observable<string> {
    // The backend uses double-submit CSRF: the header must match the current
    // XSRF-TOKEN cookie. A cached response body can become stale if the cookie
    // is rotated by another request, so always prefer the browser's live cookie.
    const cookieToken = this.readCsrfCookie();
    if (cookieToken) return of(cookieToken);
    if (!this.csrfInFlight) {
      this.csrfInFlight = this.http.get(`${this.API_URL}/csrf`, { responseType: 'text', withCredentials: true }).pipe(
        map(value => this.readCsrfCookie() || value),
        finalize(() => this.csrfInFlight = null),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.csrfInFlight;
  }

  private readCsrfCookie(): string | null {
    const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
    if (!cookie) return null;
    try { return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)); }
    catch { return cookie.slice('XSRF-TOKEN='.length); }
  }

  refreshToken(): Observable<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.ensureCsrf().pipe(
      switchMap(csrf => this.http.post<void>(`${this.API_URL}/refresh`, {}, {
        withCredentials: true, headers: { 'X-XSRF-TOKEN': csrf }
      })),
      map(() => undefined),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      }),
      finalize(() => { this.refreshInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight;
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    void this.ensureCsrf().pipe(
      switchMap(csrf => this.http.post(`${this.API_URL}/logout`, {}, {
        withCredentials: true, headers: { 'X-XSRF-TOKEN': csrf }
      })),
      catchError(() => EMPTY),
      finalize(() => {
        this.clearSession();
        this.isLoggingOut.set(false);
        void this.router.navigate(['/auth/login']);
      })
    ).subscribe();
  }

  restoreSession(): Observable<boolean> {
    return this.loadProfile().pipe(map(() => true), catchError(() => {
      this.clearSession();
      return of(false);
    }));
  }

  private clearSession(): void {
    this._currentUser.set(null);
  }
}
