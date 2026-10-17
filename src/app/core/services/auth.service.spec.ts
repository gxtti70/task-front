import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';

const profile = { id: 'u-1', email: 'dev@example.test', fullName: 'Dev User', role: 'MANAGER' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: Router, useValue: { navigate: vi.fn() } }
    ] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores identity and role from /me after cookie login, without persisting tokens', () => {
    service.login({ email: 'dev@example.test', password: 'secret' }).subscribe();
    http.expectOne('/api/auth/csrf').flush('csrf-token');
    const login = http.expectOne('/api/auth/login');
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    login.flush({ email: 'dev@example.test', role: 'ADMIN', userId: 'u-1' });
    http.expectOne('/api/auth/me').flush(profile);

    expect(service.userRole()).toBe('MANAGER');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('dev@example.test');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('restores state from /me and logout clears the server session', () => {
    service.restoreSession().subscribe();
    http.expectOne('/api/auth/me').flush(profile);
    expect(service.currentUser()?.name).toBe('Dev User');

    service.logout();
    const csrf = http.expectOne('/api/auth/csrf');
    csrf.flush('csrf-token');
    const logout = http.expectOne('/api/auth/logout');
    expect(logout.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush({ message: 'Sesión cerrada' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('removes legacy localStorage credentials on service initialization', () => {
    localStorage.setItem('access_token', 'legacy');
    localStorage.setItem('refresh_token', 'legacy');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: { navigate: vi.fn() } }] });
    TestBed.inject(AuthService);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
