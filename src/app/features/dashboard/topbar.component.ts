import { Component, OnDestroy, OnInit, computed, inject, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationItem } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileModalComponent } from '../profile/profile-modal.component';
import { TaskService } from '../../core/services/task.service';
import { Task } from '../../core/models';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ProfileModalComponent, FocusTrapDirective],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  readonly router = inject(Router);
  private taskService = inject(TaskService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private hasLoadedNotifications = false;

  isSearchOpen = signal(false);
  isNotificationsOpen = signal(false);
  isProfileOpen = signal(false);
  isNotificationsLoading = signal(false);
  notifications = signal<NotificationItem[]>([]);
  unreadCount = computed(() => this.notifications().filter(item => !item.read).length);
  hasUnreadNotifications = computed(() => this.unreadCount() > 0);
  hasNotifications = computed(() => this.hasUnreadNotifications());
  searchQuery = signal('');
  searchTasks = signal<Task[]>([]);
  searchLoading = signal(false);
  activeSearchIndex = signal(0);
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) return [];
    return this.searchTasks().filter(task => [task.title, task.description, task.id, ...task.tags].some(value => value?.toLocaleLowerCase().includes(query))).slice(0, 8);
  });

  ngOnInit(): void {
    this.loadNotifications();
    this.refreshTimer = setInterval(() => this.loadNotifications(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadNotifications(): void {
    this.isNotificationsLoading.set(true);
    this.notificationService.getMine().subscribe({
      next: notifications => {
        this.notifications.set(notifications);
        this.hasLoadedNotifications = true;
        this.isNotificationsLoading.set(false);
      },
      error: err => {
        if (!this.hasLoadedNotifications) this.toast.errorFor(err, 'No se pudieron cargar las notificaciones.');
        this.isNotificationsLoading.set(false);
      }
    });
  }

  toggleSearch(): void {
    const opening = !this.isSearchOpen();
    this.isSearchOpen.set(opening);
    if (opening) {
      this.searchQuery.set('');
      this.activeSearchIndex.set(0);
      this.searchLoading.set(true);
      this.taskService.getTasks().subscribe({
        next: tasks => { this.searchTasks.set(tasks); this.searchLoading.set(false); },
        error: error => { this.searchLoading.set(false); this.toast.errorFor(error, 'No se pudieron buscar las tareas.'); }
      });
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  handleSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeSearchIndex.update(index => (index + step + results.length) % results.length);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      this.openTaskSearchResult(results[this.activeSearchIndex()]);
    }
  }

  openTaskSearchResult(task: Task): void {
    this.isSearchOpen.set(false);
    void this.router.navigate(['/dashboard/kanban'], { queryParams: { q: task.title } });
  }

  private safeNotificationUrl(target: string): string | null {
    if (!target || !target.startsWith('/') || target.startsWith('//') || /[\\\u0000-\u001f]/.test(target)) return null;
    try {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin || !/^\/dashboard(?:\/|$)/.test(url.pathname)) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  toggleNotifications(): void {
    const opening = !this.isNotificationsOpen();
    this.isNotificationsOpen.set(opening);
    if (opening) this.loadNotifications();
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.read) return;
    this.notificationService.markRead(notification.id).subscribe({
      next: updated => this.notifications.update(items => items.map(item => item.id === updated.id ? updated : item)),
      error: err => this.toast.errorFor(err, 'No se pudo marcar la notificación como leída.')
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => this.notifications.update(items => items.map(item => ({ ...item, read: true }))),
      error: err => this.toast.errorFor(err, 'No se pudieron marcar las notificaciones como leídas.')
    });
  }

  openNotification(notification: NotificationItem): void {
    this.markAsRead(notification);
    this.isNotificationsOpen.set(false);
    const target = this.safeNotificationUrl(notification.targetUrl);
    if (target) void this.router.navigateByUrl(target);
    else this.toast.info('Esta notificación contiene un destino no válido.');
  }

  formatTime(value: string): string {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return '';
    const seconds = Math.round((timestamp - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
    return formatter.format(Math.round(hours / 24), 'day');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isNotificationsOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleSearch();
    }
    if (event.key === 'Escape') {
      this.isSearchOpen.set(false);
      this.isNotificationsOpen.set(false);
    }
  }
}
