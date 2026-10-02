import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { Project, ProjectMember, ProjectRequest, User } from '../../core/models';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './projects.component.html'
})
export class ProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private userDirectory = inject(UserDirectoryService);
  private toast = inject(ToastService);
  authService = inject(AuthService);
  isModalOpen = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);
  projects = signal<Project[]>([]);
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
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.projectService.getProjects().subscribe({
      next: projects => {
        this.projects.set(projects);
        this.isLoading.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudieron cargar los proyectos.');
        this.isLoading.set(false);
      }
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
    this.selectedInitialMemberIds.update(ids => selected
      ? ids.includes(userId) ? ids : [...ids, userId]
      : ids.filter(id => id !== userId));
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
