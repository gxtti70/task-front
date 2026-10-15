import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { catchError, retry, switchMap } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  // Intentamos obtener el token de la Signal o directamente de localStorage
  const token = authService.accessToken() || localStorage.getItem('access_token') || localStorage.getItem('token');

  // Solo omitimos la cabecera en los endpoints explícitos de login/registro
  const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');

  let clonedReq = req;
  if (token && !isAuthEndpoint) {
    // Limpieza agresiva: elimina espacios invisibles, comillas, retornos de carro y saltos de línea
    const cleanToken = String(token).trim().replace(/[\s"'\r\n]+/g, '');

    clonedReq = req.clone({
      setHeaders: {
        Authorization: 'Bearer ' + cleanToken
      }
    });
  }

  return next(clonedReq).pipe(
    retry({
      count: 2,
      delay: (error: unknown, attempt) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
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
      // Si el backend devuelve 401 y no era una petición de auth/refresh
      const isLoginOrRegister = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
      const isRefreshRequest = req.url.includes('/api/auth/refresh');
      if (error.status === 401 && !isLoginOrRegister && !isRefreshRequest) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const newToken = res.accessToken;

            // Limpieza también para el nuevo token por seguridad
            const cleanNewToken = String(newToken).trim().replace(/[\s"'\r\n]+/g, '');

            const reClonedReq = req.clone({
              setHeaders: {
                Authorization: 'Bearer ' + cleanNewToken
              }
            });
            return next(reClonedReq);
          }),
          catchError((refreshError) => {
            // Si el refresh también falla, cerramos sesión limpiamente
            authService.logout();
            toast.errorFor(refreshError, 'Tu sesión expiró. Inicia sesión de nuevo.');
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
