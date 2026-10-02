import { Component, OnDestroy, OnInit, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationItem } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private hasLoadedNotifications = false;

  isSearchOpen = signal(false);
  isNotificationsOpen = signal(false);
  isNotificationsLoading = signal(false);
  notifications = signal<NotificationItem[]>([]);
  unreadCount = computed(() => this.notifications().filter(item => !item.read).length);
  hasUnreadNotifications = computed(() => this.unreadCount() > 0);
  hasNotifications = computed(() => this.hasUnreadNotifications());

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
    this.isSearchOpen.update(value => !value);
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
    this.router.navigateByUrl(notification.targetUrl);
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
