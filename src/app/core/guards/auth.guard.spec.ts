import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('restores the cookie session and allows an authenticated user', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { restoreSession: () => of(true) } }] });
    const output = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard/projects' } as RouterStateSnapshot));
    const result = isObservable(output) ? await firstValueFrom(output as Observable<boolean | UrlTree>) : output;
    expect(result).toBe(true);
  });

  it('preserves the requested route as returnTo for anonymous users', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { restoreSession: () => of(false) } }] });
    const output = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard/projects?favoritesOnly=true' } as RouterStateSnapshot));
    const resolved = isObservable(output) ? await firstValueFrom(output as Observable<boolean | UrlTree>) : output;
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(resolved as UrlTree)).toContain('returnTo=%2Fdashboard%2Fprojects%3FfavoritesOnly%3Dtrue');
  });
});
