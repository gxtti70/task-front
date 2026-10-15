import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

function token(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: { navigate: vi.fn() } }] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('decodes role claims and normalizes ROLE_ prefix', () => {
    service.login({ email: 'dev@example.test', password: 'secret' }).subscribe();
    http.expectOne('/api/auth/login').flush({
      accessToken: token({ role: 'ROLE_MANAGER' }), refreshToken: 'refresh', email: 'dev@example.test',
      role: 'MANAGER', userId: 'u-1'
    });

    expect(service.userRole()).toBe('MANAGER');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('dev@example.test');
  });

  it('loads the current profile and clears all session values on logout', () => {
    localStorage.setItem('access_token', token({ role: 'ADMIN' }));
    service.loadProfile().subscribe();
    http.expectOne('/api/auth/me').flush({ id: 'u-1', email: 'admin@example.test', fullName: 'Admin User', role: 'ADMIN' });
    expect(service.currentUser()?.name).toBe('Admin User');

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
