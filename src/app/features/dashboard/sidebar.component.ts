import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { roleBadgeClasses } from '../../core/utils/role-style';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProjectService } from '../../core/services/project.service';
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
  private toast = inject(ToastService);
  isCollapsed = signal(false);

  public currentUser = computed(() => this.authService.currentUser());
  public userRole = computed(() => this.authService.userRole());
  public isAdmin = computed(() => this.authService.isAdmin());
  public canManageTasks = computed(() => this.authService.canManageTasks());
  public roleBadgeClasses = roleBadgeClasses;

  ngOnInit(): void {
    this.projectService.loadFavoriteProjects().subscribe({
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los proyectos favoritos.')
    });
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
}
