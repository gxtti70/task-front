import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { catchError, retry, switchMap } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);
  const isCsrfBootstrap = req.url.includes('/api/auth/csrf');
  const isRefreshRequest = req.url.includes('/api/auth/refresh');
  const isProfileRequest = req.url.includes('/api/auth/me');
  const isAuthOperation = req.url.includes('/api/auth/') && !req.url.includes('/api/auth/me');
  const withCookies = req.clone({ withCredentials: true });

  const send = (csrfToken?: string) => {
    const prepared = csrfToken
      ? withCookies.clone({ setHeaders: { 'X-XSRF-TOKEN': csrfToken } })
      : withCookies;
    return next(prepared).pipe(
      retry({
        count: 2,
        delay: (error: unknown, attempt) => SAFE_METHODS.includes(req.method)
          && error instanceof HttpErrorResponse && error.status >= 500
          ? timer(attempt * 300)
          : throwError(() => error)
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 402) {
          toast.errorFor(error, 'Has alcanzado el límite de tu plan.');
          (error as HttpErrorResponse & { _taskManagerHandled?: boolean })._taskManagerHandled = true;
          void router.navigate(['/dashboard/subscription']);
          return throwError(() => error);
        }
        if (error.status === 401 && !isAuthOperation && !isCsrfBootstrap && !isRefreshRequest) {
          return authService.ensureCsrf().pipe(
            switchMap(csrf => authService.refreshToken().pipe(
              switchMap(() => next(withCookies.clone({ setHeaders: { 'X-XSRF-TOKEN': csrf } })))
            )),
            catchError(refreshError => {
              // refreshToken() already clears local auth state. Calling logout() here
              // starts another guarded navigation, whose /me request fails the same way
              // and can create an endless navigation/refresh loop.
              if (!isProfileRequest) {
                toast.errorFor(refreshError, 'Tu sesión expiró. Inicia sesión de nuevo.');
                void router.navigate(['/auth/login']);
              }
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  };

  if (isCsrfBootstrap || SAFE_METHODS.includes(req.method)) return send();
  return authService.ensureCsrf().pipe(switchMap(token => send(token)));
};
