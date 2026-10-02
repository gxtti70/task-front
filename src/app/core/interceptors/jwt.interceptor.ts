import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);

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
    catchError((error: HttpErrorResponse) => {
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
