import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(map(authenticated => authenticated
    ? router.createUrlTree(['/dashboard/kanban'])
    : true));
};
