import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  // Si el usuario YA está autenticado e intenta ir al login o registro
  if (authService.isAuthenticated()) {
    // Lo redirigimos al tablero o dashboard principal por la fuerza
    return inject(Router).createUrlTree(['/dashboard/kanban']);
  }

  return true;
};
