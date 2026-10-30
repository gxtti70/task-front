import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'auth/google/callback',
    data: { title: 'Acceso con Google | TaskManager' },
    loadComponent: () => import('./features/auth/google-auth-callback.component').then(m => m.GoogleAuthCallbackComponent)
  },
  {
    path: '',
    redirectTo: 'dashboard/kanban',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    data: { title: 'Acceso' },
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        data: { title: 'Iniciar sesión | TaskManager' },
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        data: { title: 'Crear cuenta | TaskManager' },
        loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        data: { title: 'Recuperar contraseña | TaskManager' },
        loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        data: { title: 'Nueva contraseña | TaskManager' },
        loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    data: { title: 'TaskManager' },
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'kanban',
        data: { title: 'Tablero | TaskManager' },
        loadComponent: () => import('./features/kanban/kanban.component').then(m => m.KanbanComponent)
      },
      {
        path: 'projects',
        data: { title: 'Proyectos | TaskManager' },
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'subscription',
        data: { title: 'Planes | TaskManager' },
        loadComponent: () => import('./features/subscription/pricing.component').then(m => m.PricingComponent)
      },
      {
        path: 'admin',
        children: [
          {
            path: 'users',
            data: { title: 'Administración | TaskManager' },
            canActivate: [adminGuard],
            loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'legal',
    children: [
      {
        path: 'terminos',
        data: { title: 'Términos y Condiciones | TaskManager', doc: 'terms' },
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent)
      },
      {
        path: 'privacidad',
        data: { title: 'Política de Tratamiento de Datos | TaskManager', doc: 'privacy' },
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent)
      },
      {
        path: 'cookies',
        data: { title: 'Política de Cookies | TaskManager', doc: 'cookies' },
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'terminos' }
    ]
  },
  {
    path: 'error/401',
    loadComponent: () => import('./shared/pages/unauthorized.component').then(m => m.UnauthorizedComponent),
    data: { title: 'Sesión requerida | TaskManager' }
  },
  {
    path: 'error/403',
    loadComponent: () => import('./shared/pages/forbidden.component').then(m => m.ForbiddenComponent),
    data: { title: 'Acceso denegado | TaskManager' }
  },
  {
    path: 'error/500',
    loadComponent: () => import('./shared/pages/server-error.component').then(m => m.ServerErrorComponent),
    data: { title: 'Error del servidor | TaskManager' }
  },
  {
    path: 'not-found',
    loadComponent: () => import('./shared/pages/not-found.component').then(m => m.NotFoundComponent),
    data: { title: 'Página no encontrada | TaskManager' }
  },
  {
    path: '**',
    loadComponent: () => import('./shared/pages/not-found.component').then(m => m.NotFoundComponent),
    data: { title: 'Página no encontrada | TaskManager' }
  }
];
