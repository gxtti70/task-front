import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { FeatureGateService } from '../../core/services/feature-gate.service';
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
        { provide: FeatureGateService, useValue: { canUseAttachments: () => false } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } }
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

  it('combines text, priority, assignee, and project filters', () => {
    const component = TestBed.createComponent(KanbanComponent).componentInstance;
    component.tasks.set([
      { id: '1', title: 'Fix login', description: 'JWT refresh', status: 'TODO', priority: 'HIGH', storyPoints: 2, assignee: { id: 'u1', email: 'dev@example.test' }, tags: ['auth'], projectId: 'p1', createdAt: '' },
      { id: '2', title: 'Update docs', description: 'README', status: 'TODO', priority: 'LOW', storyPoints: 1, assignee: { id: 'u2', email: 'writer@example.test' }, tags: ['docs'], projectId: 'p2', createdAt: '' }
    ]);
    component.searchQuery.set('jwt');
    component.priorityFilter.set('HIGH');
    component.assigneeFilter.set('u1');
    component.projectFilter.set('p1');

    expect(component.filteredTasks().map(task => task.id)).toEqual(['1']);
    component.projectFilter.set('p2');
    expect(component.filteredTasks()).toEqual([]);
  });
});
