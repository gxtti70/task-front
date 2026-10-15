import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';

describe('Authentication pages', () => {
  const auth = { isAuthenticated: () => false, login: vi.fn(() => of({})), register: vi.fn(() => of('ok')) };
  const toast = { error: vi.fn(), errorFor: vi.fn(), success: vi.fn() };
  const router = { navigate: vi.fn(), navigateByUrl: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [LoginComponent, RegisterComponent], providers: [
      { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
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

  it('validates and submits registration details', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.name = ' New User ';
    component.email = 'new@example.test';
    component.password = 'secret123';
    component.onSubmit();

    expect(auth.register).toHaveBeenCalledWith({ fullName: 'New User', email: 'new@example.test', password: 'secret123' });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
