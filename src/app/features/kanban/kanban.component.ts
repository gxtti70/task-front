import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TaskModalComponent } from '../tasks/task-modal.component';
import { Task, TaskStatus, TaskPriority } from '../../core/models';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TaskModalComponent],
  templateUrl: './kanban.component.html'
})
export class KanbanComponent {
  isModalOpen = signal(false);

  tasks = signal<Task[]>([
    {
      id: 'TASK-101',
      title: 'Ajustar la jerarquía de clases abstractas',
      description: 'Refactorizar las firmas de los servicios core de infraestructura para delegar abstracciones tipadas.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      storyPoints: 5,
      tags: ['Backend', 'Architecture'],
      createdAt: '2026-06-22',
      assignee: { id: '1', name: 'Santiago Muñoz', email: 'santiago@empresa.com', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
    },
    {
      id: 'TASK-102',
      title: 'Soporte nativo para Dark Mode en UI components',
      description: 'Garantizar el cumplimiento estricto de contrastes con la paleta minimalista de zinc.',
      status: 'TODO',
      priority: 'MEDIUM',
      storyPoints: 2,
      tags: ['Design System', 'UX'],
      createdAt: '2026-06-23',
      assignee: { id: '2', name: 'Alba Castro', email: 'alba@empresa.com', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' }
    },
    {
      id: 'TASK-103',
      title: 'Integrar Lucide Angular Icons en el core de empaquetado',
      description: 'Mitigar el bloating reduciendo el bundle size importando unicamente los glifos requeridos.',
      status: 'REVIEW',
      priority: 'LOW',
      storyPoints: 1,
      tags: ['Frontend'],
      createdAt: '2026-06-24',
      assignee: { id: '1', name: 'Santiago Muñoz', email: 'santiago@empresa.com', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
    }
  ]);

  todoTasks = computed(() => this.tasks().filter(t => t.status === 'TODO'));
  inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'IN_PROGRESS'));
  reviewTasks = computed(() => this.tasks().filter(t => t.status === 'REVIEW'));
  impededTasks = computed(() => this.tasks().filter(t => (t.status as any) === 'IMPEDIMENT')); // 🚀 Solución al error de comparación
  doneTasks = computed(() => this.tasks().filter(t => t.status === 'DONE'));

  openCreateModal() {
    this.isModalOpen.set(true);
  }

  closeCreateModal() {
    this.isModalOpen.set(false);
  }

  handleTaskCreated(taskPayload: Partial<Task>) {
    const completeTask: Task = {
      id: `TASK-${Math.floor(100 + Math.random() * 900)}`,
      title: taskPayload.title || 'Untitled task',
      description: taskPayload.description || '',
      status: taskPayload.status || 'TODO',
      priority: taskPayload.priority || 'MEDIUM',
      storyPoints: taskPayload.storyPoints || 1,
      tags: taskPayload.tags || ['Feature'],
      createdAt: taskPayload.createdAt || new Date().toISOString(),
      assignee: taskPayload.assignee || { id: '1', name: 'Guest', email: 'guest@empresa.com' }
    };

    this.tasks.update(all => [...all, completeTask]);
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case 'URGENT': return 'bg-red-950/60 text-red-400 border border-red-900/60';
      case 'HIGH': return 'bg-orange-950/60 text-orange-400 border border-orange-900/60';
      case 'MEDIUM': return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
      case 'LOW': return 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/80';
    }
  }

  cycleStatus(task: Task) {
    // 🚀 Solución al error de asignación usando un cast manual a string array
    const states = ['TODO', 'IN_PROGRESS', 'REVIEW', 'IMPEDIMENT', 'DONE'];
    const nextIndex = (states.indexOf(task.status) + 1) % states.length;
    const nextStatus = states[nextIndex] as TaskStatus;

    this.tasks.update(all => all.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
  }
}