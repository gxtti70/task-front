import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Project, ProjectMember, ProjectRequest, User } from '../../core/models';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { FeatureGateService } from '../../core/services/feature-gate.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective, SkeletonComponent, EmptyStateComponent],
  templateUrl: './projects.component.html'
})
export class ProjectsComponent implements OnInit {
  readonly projectService = inject(ProjectService);
  private userDirectory = inject(UserDirectoryService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  readonly subscription = inject(SubscriptionService);
  readonly featureGate = inject(FeatureGateService);
  authService = inject(AuthService);
  isModalOpen = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);
  projects = signal<Project[]>([]);
  favoritesOnly = signal(false);
  visibleProjects = computed(() => {
    const projects = this.projects();
    if (!this.favoritesOnly()) return projects;
    const favoriteIds = new Set(this.projectService.favoriteProjects().map(project => project.id));
    return projects.filter(project => favoriteIds.has(project.id));
  });
  editingProject = signal<Project | null>(null);
  selectedProject = signal<Project | null>(null);
  members = signal<ProjectMember[]>([]);
  users = signal<User[]>([]);
  isLoadingMembers = signal(false);
  isLoadingUsers = signal(false);
  selectedInitialMemberIds = signal<string[]>([]);
  selectedUserId = '';

  availableUsers = computed(() => this.users().filter(user =>
    user.id && !this.members().some(member => member.id === user.id)));
  availableInitialMembers = computed(() => this.users().filter(user =>
    user.id && user.id !== this.authService.currentUser()?.id));

  newProject: ProjectRequest = { name: '', description: '', status: 'ACTIVE' };

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params =>
      this.favoritesOnly.set(params.get('favoritesOnly') === 'true'));
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    forkJoin({ projects: this.projectService.getProjects(), favorites: this.projectService.loadFavoriteProjects() }).subscribe({
      next: ({ projects }) => {
        this.projects.set(projects);
        this.isLoading.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudieron cargar los proyectos.');
        this.isLoading.set(false);
      }
    });
  }

  toggleFavorite(project: Project): void {
    const shouldFavorite = !this.projectService.isFavorite(project.id);
    this.projectService.setFavorite(project, shouldFavorite).subscribe({
      next: () => this.toast.success(shouldFavorite ? 'Proyecto agregado a favoritos.' : 'Proyecto quitado de favoritos.'),
      error: err => this.toast.errorFor(err, 'No se pudo actualizar el favorito. Solo los miembros pueden guardar proyectos.')
    });
  }

  canManage(project: Project): boolean {
    return this.authService.isAdmin() || this.authService.currentUser()?.id === project.ownerId;
  }

  openCreateModal(): void {
    if (!this.authService.canManageTasks()) {
      this.toast.error('Tu rol no permite crear proyectos.', 'Permiso insuficiente');
      return;
    }
    if (!this.featureGate.canCreateProject()) {
      this.toast.info('Tu plan ya llegó al máximo de proyectos. Elige otro plan para crear uno más.', 'Límite del plan alcanzado');
      void this.router.navigateByUrl('/dashboard/subscription');
      return;
    }
    this.editingProject.set(null);
    this.newProject = { name: '', description: '', status: 'ACTIVE' };
    this.selectedInitialMemberIds.set([]);
    this.loadUsers();
    this.isModalOpen.set(true);
  }

  openEditModal(project: Project): void {
    this.editingProject.set(project);
    this.newProject = { name: project.name, description: project.description || '', status: project.status };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingProject.set(null);
    this.newProject = { name: '', description: '', status: 'ACTIVE' };
    this.selectedInitialMemberIds.set([]);
  }

  saveProject(): void {
    const editing = this.editingProject();
    if (!editing && !this.authService.canManageTasks()) {
      this.toast.error('Tu rol no permite crear proyectos.', 'Permiso insuficiente');
      return;
    }
    const request = {
      ...this.newProject,
      name: this.newProject.name.trim(),
      description: this.newProject.description.trim()
    };
    if (!request.name) return;
    this.isSaving.set(true);
    if (editing) {
      this.projectService.updateProject(editing.id, request).subscribe({
        next: project => {
          this.projects.update(projects => projects.map(item => item.id === project.id ? project : item));
          this.closeModal();
          this.toast.success('El proyecto se actualizó.');
          this.isSaving.set(false);
        },
        error: err => {
          this.toast.errorFor(err, 'No se pudo guardar el proyecto.');
          this.isSaving.set(false);
        }
      });
      return;
    }

    const initialMemberIds = this.selectedInitialMemberIds();
    this.projectService.createProject(request).subscribe({
      next: project => {
        this.projects.update(projects => [project, ...projects]);
        if (initialMemberIds.length === 0) {
          this.closeModal();
          this.toast.success('El proyecto se creó.');
          this.isSaving.set(false);
          return;
        }

        forkJoin(initialMemberIds.map(userId => this.projectService.addMember(project.id, userId))).subscribe({
          next: addedMembers => {
            const updatedProject = { ...project, membersCount: project.membersCount + addedMembers.length };
            this.projects.update(projects => projects.map(item => item.id === project.id ? updatedProject : item));
            this.closeModal();
            this.toast.success(`Proyecto creado con ${addedMembers.length} miembro${addedMembers.length === 1 ? '' : 's'}.`);
            this.isSaving.set(false);
          },
          error: err => {
            this.closeModal();
            this.toast.errorFor(err, 'El proyecto se creó, pero no se pudieron añadir todos los miembros. Revisa la lista de miembros.');
            this.isSaving.set(false);
            this.openMembers(project);
            this.loadProjects();
          }
        });
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudo crear el proyecto.');
        this.isSaving.set(false);
      }
    });
  }

  toggleInitialMember(userId: string, selected: boolean): void {
    if (selected && !this.featureGate.canAddMember(1 + this.selectedInitialMemberIds().length)) {
      this.toast.info('Tu plan limita la cantidad de miembros por proyecto. Puedes elegir otro plan.', 'Límite de miembros');
      return;
    }
    this.selectedInitialMemberIds.update(ids => selected
      ? ids.includes(userId) ? ids : [...ids, userId]
      : ids.filter(id => id !== userId));
  }

  toggleInitialMemberFromEvent(userId: string, event: Event): void {
    this.toggleInitialMember(userId, (event.target as HTMLInputElement).checked);
  }

  private loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.userDirectory.getActiveUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.isLoadingUsers.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudieron cargar los usuarios disponibles.');
        this.isLoadingUsers.set(false);
      }
    });
  }

  archiveProject(project: Project): void {
    const request: ProjectRequest = { name: project.name, description: project.description || '', status: 'ARCHIVED' };
    this.projectService.updateProject(project.id, request).subscribe({
      next: updated => {
        this.projects.update(projects => projects.map(item => item.id === updated.id ? updated : item));
        this.toast.success('El proyecto se archivó.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo archivar el proyecto.')
    });
  }

  openMembers(project: Project): void {
    this.selectedProject.set(project);
    this.isLoadingMembers.set(true);
    this.selectedUserId = '';
    this.projectService.getMembers(project.id).subscribe({
      next: members => {
        this.members.set(members);
        this.isLoadingMembers.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudieron cargar los miembros del proyecto.');
        this.isLoadingMembers.set(false);
      }
    });
    this.loadUsers();
  }

  closeMembers(): void {
    this.selectedProject.set(null);
    this.members.set([]);
  }

  addMember(): void {
    const project = this.selectedProject();
    if (!project || !this.selectedUserId) return;
    if (!this.featureGate.canAddMember(this.members().length)) {
      this.toast.info('Este proyecto alcanzó el máximo de miembros de tu plan.', 'Límite de miembros');
      return;
    }
    this.projectService.addMember(project.id, this.selectedUserId).subscribe({
      next: member => {
        this.members.update(members => [...members, member]);
        this.projects.update(projects => projects.map(item => item.id === project.id
          ? { ...item, membersCount: item.membersCount + 1 } : item));
        this.selectedUserId = '';
        this.toast.success('Se agregó el miembro al proyecto.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo agregar el miembro.')
    });
  }

  removeMember(member: ProjectMember): void {
    const project = this.selectedProject();
    if (!project) return;
    this.projectService.removeMember(project.id, member.id).subscribe({
      next: () => {
        this.members.update(members => members.filter(item => item.id !== member.id));
        this.projects.update(projects => projects.map(item => item.id === project.id
          ? { ...item, membersCount: Math.max(0, item.membersCount - 1) } : item));
        this.toast.success('Se quitó el miembro del proyecto.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo quitar el miembro.')
    });
  }
}
