import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
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
  selectedUserId = '';

  availableUsers = computed(() => this.users().filter(user =>
    user.id && !this.members().some(member => member.id === user.id)));

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
    const operation = editing
      ? this.projectService.updateProject(editing.id, request)
      : this.projectService.createProject(request);
    operation.subscribe({
      next: project => {
        this.projects.update(projects => editing
          ? projects.map(item => item.id === project.id ? project : item)
          : [project, ...projects]);
        this.closeModal();
        this.toast.success(editing ? 'El proyecto se actualizó.' : 'El proyecto se creó.');
        this.isSaving.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudo guardar el proyecto.');
        this.isSaving.set(false);
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
    this.userDirectory.getActiveUsers().subscribe({
      next: users => this.users.set(users),
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los usuarios disponibles.')
    });
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
