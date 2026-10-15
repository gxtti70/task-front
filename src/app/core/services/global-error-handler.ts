import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private handling = false;

  handleError(error: unknown): void {
    console.error('Error no controlado en TaskManager', error);
    this.toast.error('Ocurrió un error inesperado. Inténtalo de nuevo.');
    if (!this.handling && !this.router.url.startsWith('/error/500')) {
      this.handling = true;
      void this.router.navigateByUrl('/error/500').finally(() => { this.handling = false; });
    }
  }
}
