import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { LucideAngularModule, Layers } from 'lucide-angular';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { OtpInputComponent } from './otp-input.component';
import { RecoverPasswordComponent } from './recover-password.component';

describe('Recuperación de contraseña por código', () => {
  const auth = {
    requestRecoveryCode: vi.fn(() => of({
      message: 'Si el email está registrado, recibirás un código de 6 dígitos para restablecer tu contraseña.',
      resendAvailableInSeconds: 60
    })),
    resetPasswordWithCode: vi.fn(() => of('Contraseña actualizada exitosamente'))
  };
  const toast = { error: vi.fn(), errorFor: vi.fn(), success: vi.fn() };
  const router = { navigateByUrl: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent, OtpInputComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        importProvidersFrom(LucideAngularModule.pick({ Layers }))
      ]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function createWizard() {
    const fixture = TestBed.createComponent(RecoverPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('solicita el código y avanza al paso de verificación', () => {
    const component = createWizard();
    component.email = 'user@example.test';

    component.onRequestCode();

    expect(auth.requestRecoveryCode).toHaveBeenCalledWith('user@example.test');
    expect(component.step()).toBe('code');
    expect(toast.success).toHaveBeenCalled();
  });

  it('no reenvía el código mientras sigue la cuenta regresiva', () => {
    const component = createWizard();
    component.email = 'user@example.test';
    component.onRequestCode();
    const callsAfterFirstRequest = auth.requestRecoveryCode.mock.calls.length;

    component.onResend();

    expect(auth.requestRecoveryCode).toHaveBeenCalledTimes(callsAfterFirstRequest);
    expect(component.countdown()).toBeGreaterThan(0);
  });

  it('llena las seis casillas al pegar el código completo', () => {
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.codeChange.subscribe(value => emitted.push(value));

    component.onPaste({
      preventDefault: vi.fn(),
      clipboardData: { getData: () => '123456' }
    } as unknown as ClipboardEvent);

    expect(component.digits()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(emitted).toEqual(['123456']);
  });

  it('ignora los caracteres que no son dígitos al pegar', () => {
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.onPaste({
      preventDefault: vi.fn(),
      clipboardData: { getData: () => '1a2b3c' }
    } as unknown as ClipboardEvent);

    expect(component.digits()).toEqual(['1', '2', '3', '', '', '']);
  });

  it('no continúa al paso de contraseña con un código incompleto', () => {
    const component = createWizard();
    component.code = '123';

    component.onContinueWithCode();

    expect(component.step()).toBe('email');
    expect(toast.error).toHaveBeenCalled();
  });

  it('restablece la contraseña con el código y vuelve al login', () => {
    const component = createWizard();
    component.email = 'user@example.test';
    component.code = '123456';
    component.password = 'new-password';
    component.confirmPassword = 'new-password';

    component.onResetPassword();

    expect(auth.resetPasswordWithCode).toHaveBeenCalledWith('user@example.test', '123456', 'new-password');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('no envía contraseñas que no coinciden', () => {
    const component = createWizard();
    component.email = 'user@example.test';
    component.code = '123456';
    component.password = 'new-password';
    component.confirmPassword = 'otra-cosa';

    component.onResetPassword();

    expect(auth.resetPasswordWithCode).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('muestra el error del servidor cuando el código es rechazado', () => {
    auth.resetPasswordWithCode.mockReturnValueOnce(throwError(() => ({
      status: 400,
      error: { message: 'El código no es válido o ha expirado. Solicita uno nuevo e inténtalo otra vez.' }
    })));
    const component = createWizard();
    component.email = 'user@example.test';
    component.code = '000000';
    component.password = 'new-password';
    component.confirmPassword = 'new-password';

    component.onResetPassword();

    expect(toast.errorFor).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
