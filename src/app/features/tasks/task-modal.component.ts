import { Component, OnInit, signal, output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../core/models';
import { ProjectService } from '../../core/services/project.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './task-modal.component.html'
})
export class TaskModalComponent implements OnInit {
  @Input() task: Task | null = null;
  closeModal = output<void>();
  taskCreated = output<Partial<Task>>();
  private projectService = inject(ProjectService);
  private userService = inject(UserDirectoryService);
  private toast = inject(ToastService);
  projects = signal<Project[]>([]);
  users = signal<User[]>([]);

  title = '';
  description = '';
  priority: TaskPriority = 'MEDIUM';
  status: TaskStatus = 'TODO';
  storyPoints = 1;
  tagsString = '';
  projectId = '';
  assigneeId = '';

  ngOnInit(): void {
    if (this.task) {
      this.title = this.task.title;
      this.description = this.task.description || '';
      this.priority = this.task.priority;
      this.status = this.task.status;
      this.storyPoints = this.task.storyPoints;
      this.tagsString = this.task.tags.join(', ');
      this.projectId = this.task.projectId || '';
      this.assigneeId = this.task.assignee.id || '';
    }
    this.projectService.getProjects().subscribe({
      next: projects => this.projects.set(projects.filter(project => project.status !== 'ARCHIVED')),
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los proyectos disponibles.')
    });
    this.userService.getActiveUsers().subscribe({
      next: users => this.users.set(users),
      error: err => this.toast.errorFor(err, 'No se pudieron cargar los usuarios disponibles.')
    });
  }

  onDismiss() {
    this.closeModal.emit();
  }

  onSubmit() {
    const title = this.title.trim();
    if (!title) return;

    const tags = this.tagsString.split(',').map(tag => tag.trim()).filter(Boolean);

    const newTask: Partial<Task> = {
      title,
      description: this.description.trim(),
      priority: this.priority,
      status: this.status,
      storyPoints: this.storyPoints,
      tags,
      projectId: this.projectId || null,
      assigneeId: this.assigneeId || undefined
    };

    this.taskCreated.emit(newTask);
  }
}
