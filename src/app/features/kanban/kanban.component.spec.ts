import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { KanbanComponent } from './kanban.component';

describe('KanbanComponent task creation permissions', () => {
  let taskService: { getTasks: ReturnType<typeof vi.fn>; createTask: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; errorFor: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let canManageTasks: boolean;

  beforeEach(() => {
    canManageTasks = false;
    taskService = { getTasks: vi.fn(() => of([])), createTask: vi.fn(() => of({})) };
    toast = { error: vi.fn(), errorFor: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      imports: [KanbanComponent],
      providers: [
        { provide: AuthService, useValue: { canManageTasks: () => canManageTasks } },
        { provide: TaskService, useValue: taskService },
        { provide: ProjectService, useValue: { getProjects: () => of([]) } },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('blocks a developer from opening task creation', () => {
    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.componentInstance.openCreateModal();

    expect(fixture.componentInstance.isModalOpen()).toBe(false);
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('blocks a developer from submitting task creation directly', () => {
    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.componentInstance.saveTask({ title: 'Test' });

    expect(taskService.createTask).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('allows an authorized role to submit task creation', () => {
    canManageTasks = true;
    const fixture = TestBed.createComponent(KanbanComponent);
    fixture.componentInstance.saveTask({ title: 'Test' });

    expect(taskService.createTask).toHaveBeenCalledOnce();
  });
});
