import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
         aria-live="polite" aria-atomic="false">
      @for (toast of toastService.messages(); track toast.id) {
        <section class="flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl animate-fade-in"
          [ngClass]="{
            'border-emerald-800/80 bg-zinc-950/95': toast.kind === 'success',
            'border-red-800/80 bg-zinc-950/95': toast.kind === 'error',
            'border-sky-800/80 bg-zinc-950/95': toast.kind === 'info'
          }"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            [ngClass]="{
              'bg-emerald-400/15 text-emerald-300': toast.kind === 'success',
              'bg-red-400/15 text-red-300': toast.kind === 'error',
              'bg-sky-400/15 text-sky-300': toast.kind === 'info'
            }">
            {{ toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'i' }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-white">{{ toast.title }}</p>
            <p class="mt-1 text-xs leading-relaxed text-zinc-300">{{ toast.message }}</p>
          </div>
          <button type="button" (click)="toastService.dismiss(toast.id)"
            class="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none text-zinc-500 hover:bg-zinc-800 hover:text-white"
            aria-label="Cerrar notificación">×</button>
        </section>
      }
    </div>
  `
})
export class ToastViewportComponent {
  toastService = inject(ToastService);
}
