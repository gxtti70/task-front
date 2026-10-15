import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows an authenticated user', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: () => true } }] });
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard/projects' } as RouterStateSnapshot))).toBe(true);
  });

  it('preserves the requested route as returnTo for anonymous users', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: () => false } }] });
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard/projects?favoritesOnly=true' } as RouterStateSnapshot));
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toContain('returnTo=%2Fdashboard%2Fprojects%3FfavoritesOnly%3Dtrue');
  });
});
