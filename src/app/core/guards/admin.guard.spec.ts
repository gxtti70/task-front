import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  it('allows administrators and redirects other roles to the board', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard/admin/users' } as RouterStateSnapshot;
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { isAdmin: () => true } }] });
    expect(TestBed.runInInjectionContext(() => adminGuard(route, state))).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { isAdmin: () => false } }] });
    const destination = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(TestBed.inject(Router).serializeUrl(destination as ReturnType<Router['createUrlTree']>)).toBe('/dashboard/kanban');
  });
});
