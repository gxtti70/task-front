import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { AnnouncementService } from '../../core/services/announcement.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { Announcement } from '../../core/models';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, FocusTrapDirective],
  template: `
    <div class="flex h-dvh w-full overflow-hidden bg-background">
      @if (mobileNavOpen()) {
        <div class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" (click)="mobileNavOpen.set(false)" aria-hidden="true"></div>
      }
      <app-sidebar [mobileOpen]="mobileNavOpen()" (closed)="mobileNavOpen.set(false)"></app-sidebar>
      <div class="flex-1 flex flex-col min-w-0">
        <app-topbar (menuToggle)="mobileNavOpen.update(v => !v)"></app-topbar>
        <main class="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
    @if (auth.isLoggingOut()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm" role="status" aria-live="polite" aria-label="Cerrando sesión">
        <div class="flex flex-col items-center gap-4 text-center">
          <span class="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" aria-hidden="true"></span>
          <p class="text-sm font-medium text-zinc-200">Cerrando sesión…</p>
        </div>
      </div>
    }
    @if (welcome(); as announcement) {
      <div class="premium-overlay z-[90]" (click)="closeWelcome()">
        <section appFocusTrap role="dialog" aria-modal="true" [attr.aria-label]="announcement.title" class="premium-dialog flex w-full max-w-lg flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <header class="premium-dialog-header shrink-0 bg-gradient-to-br from-indigo-950/65 via-violet-950/25 to-transparent px-6 py-7">
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">✦</div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Novedades</p>
            <h2 class="mt-2 text-xl font-semibold text-white">{{ announcement.title }}</h2>
          </header>
          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <p class="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{{ announcement.body }}</p>
            <label class="flex cursor-pointer items-center gap-2 text-xs text-zinc-500"><input type="checkbox" [checked]="rememberWelcome()" (change)="updateRememberWelcome($event)" class="accent-sky-400">No mostrar de nuevo</label>
          </div>
          <footer class="shrink-0 border-t border-white/[0.07] bg-zinc-950/70 px-6 py-4"><div class="flex justify-end"><button (click)="closeWelcome()" class="premium-primary-button">Entendido</button></div></footer>
        </section>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  private announcements = inject(AnnouncementService);
  private subscriptions = inject(SubscriptionService);
  private auth = inject(AuthService);
  readonly welcome = signal<Announcement | null>(null);
  readonly rememberWelcome = signal(true);
  readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    forkJoin({
      profile: this.auth.loadProfile().pipe(catchError(() => of(null))),
      subscription: this.subscriptions.getMine().pipe(catchError(() => of(null))),
      announcements: this.announcements.pending().pipe(catchError(() => of([] as Announcement[])))
    }).subscribe(({ announcements: items }) => {
      const user = this.auth.currentUser();
      const userId = user?.id || user?.email || 'unknown';
      this.welcome.set(items.find(item => localStorage.getItem(`hasSeenWelcome_${userId}`) !== item.key) || null);
    });
  }

  closeWelcome(): void {
    const item = this.welcome();
    if (!item) return;
    const user = this.auth.currentUser();
    const userId = user?.id || user?.email || 'unknown';
    if (this.rememberWelcome()) {
      localStorage.setItem(`hasSeenWelcome_${userId}`, item.key);
      this.announcements.dismiss(item.key).subscribe({ error: () => undefined });
    } else {
      localStorage.removeItem(`hasSeenWelcome_${userId}`);
    }
    this.welcome.set(null);
  }

  updateRememberWelcome(event: Event): void {
    this.rememberWelcome.set((event.target as HTMLInputElement).checked);
  }
}
