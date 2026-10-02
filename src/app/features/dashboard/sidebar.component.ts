import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { roleBadgeClasses } from '../../core/utils/role-style';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  public authService = inject(AuthService);
  isCollapsed = signal(false);

  public currentUser = computed(() => this.authService.currentUser());
  public userRole = computed(() => this.authService.userRole());
  public isAdmin = computed(() => this.authService.isAdmin());
  public canManageTasks = computed(() => this.authService.canManageTasks());
  public roleBadgeClasses = roleBadgeClasses;

  // Prioriza el nombre completo, username, name o el correo electrónico de forma limpia
  public displayName = computed(() => {
    const user = this.currentUser() as any;
    return user?.fullName?.trim()
      || user?.name?.trim()
      || user?.username?.trim()
      || user?.email?.split('@')[0]
      || 'Usuario';
  });

  // URL del avatar con iniciales automáticas seguras y codificadas
  public avatarUrl = computed(() => {
    const user = this.currentUser() as any;
    if (user?.avatarUrl) return user.avatarUrl;
    const nameForAvatar = this.displayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=27272a&color=a1a1aa&bold=true`;
  });

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }
}
