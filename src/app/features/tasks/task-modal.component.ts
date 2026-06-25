import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Task, TaskPriority, TaskStatus } from '../../core/models';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './task-modal.component.html'
})
export class TaskModalComponent {
  closeModal = output<void>();
  taskCreated = output<Partial<Task>>();

  title = '';
  description = '';
  priority: TaskPriority = 'MEDIUM';
  status: TaskStatus = 'TODO';
  storyPoints = 1;
  tagsString = '';

  onDismiss() {
    this.closeModal.emit();
  }

  onSubmit() {
    if (!this.title.trim()) return;

    const tags = this.tagsString ? this.tagsString.split(',').map(t => t.trim()) : ['Feature'];

    const newTask: Partial<Task> = {
      title: this.title,
      description: this.description,
      priority: this.priority,
      status: this.status,
      storyPoints: this.storyPoints,
      tags: tags,
      createdAt: new Date().toISOString(),
      assignee: {
        id: '1',
        name: 'Santiago Muñoz',
        email: 'santiago@empresa.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      }
    };

    this.taskCreated.emit(newTask);
    this.closeModal.emit();
  }
}
