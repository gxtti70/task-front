import { Component, HostListener, computed, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { roleBadgeClasses } from '../../core/utils/role-style';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProjectService } from '../../core/services/project.service';
import { ChatService } from '../../core/services/chat.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  public authService = inject(AuthService);
  public subscriptionService = inject(SubscriptionService);
  public projectService = inject(ProjectService);
  public chatService = inject(ChatService);
  public theme = inject(ThemeService);
  private toast = inject(ToastService);

  isCollapsed = signal(false);

  /** Drawer state on small screens, controlled by the dashboard shell. */
  mobileOpen = input(false);
  closed = output<void>();

  public currentUser = computed(() => this.authService.currentUser());
  public userRole = computed(() => this.authService.userRole());
  public isAdmin = computed(() => this.authService.isAdmin());
  public canManageTasks = computed(() => this.authService.canManageTasks());
  public roleBadgeClasses = roleBadgeClasses;

  /** Labels are always visible on the mobile drawer, even if the desktop rail is collapsed. */
  public showLabels = computed(() => !this.isCollapsed() || this.mobileOpen());

  /** Total de mensajes no leídos en todos los canales del chat. */
  public unreadTotal = computed(() => {
    let total = 0;
    for (const count of this.chatService.unreadCounts().values()) {
      total += count;
    }
    return total;
  });

  ngOnInit(): void {
    this.projectService.loadFavoriteProjects().subscribe({
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los proyectos favoritos.')
    });
    this.chatService.fetchUnreadCounts();
  }

  // Prioriza el nombre completo, username, name o el correo electrónico de forma limpia
  public displayName = computed(() => {
    const user = this.currentUser();
    return user?.fullName?.trim()
      || user?.name?.trim()
      || user?.email?.split('@')[0]
      || 'Usuario';
  });

  public avatarUrl = computed(() => this.currentUser()?.avatarUrl || this.currentUser()?.avatarData || null);

  public avatarInitials = computed(() => {
    const words = this.displayName().trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words.at(-1)![0] : words[0]?.slice(0, 2) || 'U').toUpperCase();
  });

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }

  closeMobile(): void {
    if (this.mobileOpen()) this.closed.emit();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }

  /** Icono de lucide para el tema actual. */
  themeIcon(): string {
    const t = this.theme.theme();
    if (t === 'dark') return 'moon';
    if (t === 'light') return 'sun';
    return 'droplet';
  }

  /** Etiqueta legible del tema actual. */
  themeLabel(): string {
    const t = this.theme.theme();
    if (t === 'dark') return 'Oscuro';
    if (t === 'light') return 'Claro';
    return 'Azul';
  }

  /** Cambia al siguiente tema: claro → oscuro → azul → claro. */
  toggleTheme(): void {
    this.theme.toggleLightDark();
  }
}
