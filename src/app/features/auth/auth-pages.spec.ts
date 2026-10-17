import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { LucideAngularModule, Layers } from 'lucide-angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { LegalService } from '../../core/services/legal.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';

describe('Authentication pages', () => {
  const auth = { isAuthenticated: () => false, login: vi.fn(() => of({})), register: vi.fn(() => of('ok')) };
  const toast = { error: vi.fn(), errorFor: vi.fn(), success: vi.fn() };
  const router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
  const legal = {
    getVersions: vi.fn(() => of({
      termsVersion: '1.0', privacyVersion: '1.0', cookiesVersion: '1.0', effectiveDate: '2026-10-16',
      controllerName: 'Acme', controllerTaxId: '900', controllerAddress: 'Bogotá', privacyEmail: 'p@acme.test'
    }))
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [LoginComponent, RegisterComponent], providers: [
      { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast },
      { provide: LegalService, useValue: legal },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      importProvidersFrom(LucideAngularModule.pick({ Layers }))
    ] });
  });

  it('submits login and redirects to the default protected landing page', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.email = 'user@example.test';
    component.password = 'secret123';
    component.onSubmit();

    expect(auth.login).toHaveBeenCalledWith({ email: 'user@example.test', password: 'secret123' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard/kanban');
  });

  it('validates and submits registration details with the accepted legal versions', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.name = ' New User ';
    component.email = 'new@example.test';
    component.password = 'secret123';
    component.acceptTerms = true;
    component.acceptPrivacy = true;
    component.onSubmit();

    expect(auth.register).toHaveBeenCalledWith({
      fullName: 'New User', email: 'new@example.test', password: 'secret123',
      acceptTerms: true, acceptPrivacy: true, termsVersion: '1.0', privacyVersion: '1.0'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('blocks registration until the legal documents are accepted', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.name = 'New User';
    component.email = 'new@example.test';
    component.password = 'secret123';
    component.onSubmit();

    expect(auth.register).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
