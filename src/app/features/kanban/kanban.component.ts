import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { TaskModalComponent } from '../tasks/task-modal.component';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../core/models';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, LucideAngularModule, TaskModalComponent],
  templateUrl: './kanban.component.html'
})
export class KanbanComponent implements OnInit {
  private taskService = inject(TaskService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);
  private projectService = inject(ProjectService);

  isModalOpen = signal(false);
  isLoading = signal(true);
  editingTask = signal<Task | null>(null);
  taskToDelete = signal<Task | null>(null);
  searchQuery = signal('');
  priorityFilter = signal<TaskPriority | 'ALL'>('ALL');
  assigneeFilter = signal<string>('ALL');
  projectFilter = signal<string>('ALL');
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);

  statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'TODO', label: 'Por hacer' },
    { value: 'IN_PROGRESS', label: 'En progreso' },
    { value: 'REVIEW', label: 'En revisión' },
    { value: 'IMPEDIMENT', label: 'Bloqueado' },
    { value: 'DONE', label: 'Finalizado' }
  ];
  dropListIds = this.statusOptions.map(status => `kanban-${status.value}`);

  assignees = computed(() => {
    const users = new Map<string, User>();
    for (const task of this.tasks()) {
      if (task.assignee.id) users.set(task.assignee.id, task.assignee);
    }
    return [...users.values()];
  });

  filteredTasks = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.tasks().filter(task => {
      const matchesText = !query || `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query);
      const matchesPriority = this.priorityFilter() === 'ALL' || task.priority === this.priorityFilter();
      const matchesAssignee = this.assigneeFilter() === 'ALL' || task.assignee.id === this.assigneeFilter();
      const matchesProject = this.projectFilter() === 'ALL'
        || (this.projectFilter() === 'NONE' ? !task.projectId : task.projectId === this.projectFilter());
      return matchesText && matchesPriority && matchesAssignee && matchesProject;
    });
  });

  todoTasks = computed(() => this.filteredTasks().filter(task => task.status === 'TODO'));
  inProgressTasks = computed(() => this.filteredTasks().filter(task => task.status === 'IN_PROGRESS'));
  reviewTasks = computed(() => this.filteredTasks().filter(task => task.status === 'REVIEW'));
  impededTasks = computed(() => this.filteredTasks().filter(task => task.status === 'IMPEDIMENT'));
  doneTasks = computed(() => this.filteredTasks().filter(task => task.status === 'DONE'));

  tasksForStatus(status: TaskStatus): Task[] {
    return this.filteredTasks().filter(task => task.status === status);
  }

  getStatusClass(status: TaskStatus): string {
    switch (status) {
      case 'TODO': return 'border-zinc-700 bg-zinc-800 text-zinc-300';
      case 'IN_PROGRESS': return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
      case 'REVIEW': return 'border-violet-500/30 bg-violet-500/10 text-violet-400';
      case 'IMPEDIMENT': return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'DONE': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    }
  }

  ngOnInit(): void {
    this.loadTasks();
    this.projectService.getProjects().subscribe({
      next: projects => this.projects.set(projects),
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los proyectos para filtrar.')
    });
  }

  loadTasks(): void {
    this.isLoading.set(true);
    this.taskService.getTasks().subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudieron cargar las tareas.');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    if (!this.authService.canManageTasks()) {
      this.toast.error('Tu rol no permite crear tareas.', 'Permiso insuficiente');
      return;
    }
    this.editingTask.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.isModalOpen.set(true);
  }

  closeTaskModal(): void {
    this.isModalOpen.set(false);
    this.editingTask.set(null);
  }

  saveTask(payload: Partial<Task>): void {
    const editing = this.editingTask();
    if (!editing && !this.authService.canManageTasks()) {
      this.toast.error('Tu rol no permite crear tareas.', 'Permiso insuficiente');
      return;
    }
    const request = editing
      ? this.taskService.updateTask(editing.id, payload)
      : this.taskService.createTask(payload);
    request.subscribe({
      next: task => {
        this.tasks.update(tasks => editing
          ? tasks.map(item => item.id === task.id ? task : item)
          : [...tasks, task]);
        this.closeTaskModal();
        this.toast.success(editing ? 'La tarea se actualizó.' : 'La tarea se creó.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo guardar la tarea.')
    });
  }

  setTaskStatus(task: Task, status: TaskStatus): void {
    if (task.status === status) return;
    const previousStatus = task.status;
    this.tasks.update(tasks => tasks.map(item => item.id === task.id ? { ...item, status } : item));
    this.taskService.updateTaskStatus(task.id, status).subscribe({
      next: updated => this.tasks.update(tasks => tasks.map(item => item.id === updated.id ? updated : item)),
      error: err => {
        this.tasks.update(tasks => tasks.map(item => item.id === task.id ? { ...item, status: previousStatus } : item));
        this.toast.errorFor(err, 'No se pudo actualizar el estado de la tarea.');
      }
    });
  }

  dropTask(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    const task = (event.item.data as Task | undefined)
      ?? event.previousContainer.data[event.previousIndex];
    if (task) this.setTaskStatus(task, targetStatus);
  }

  requestDelete(task: Task): void {
    this.taskToDelete.set(task);
  }

  cancelDelete(): void {
    this.taskToDelete.set(null);
  }

  confirmDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;
    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks.update(tasks => tasks.filter(item => item.id !== task.id));
        this.taskToDelete.set(null);
        this.toast.success('La tarea se eliminó.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo eliminar la tarea.')
    });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.priorityFilter.set('ALL');
    this.assigneeFilter.set('ALL');
    this.projectFilter.set('ALL');
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case 'URGENT': return 'bg-red-950/60 text-red-400 border border-red-900/60';
      case 'HIGH': return 'bg-orange-950/60 text-orange-400 border border-orange-900/60';
      case 'MEDIUM': return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
      case 'LOW': return 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/80';
    }
  }
}
