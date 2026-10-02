import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { ProjectsComponent } from './projects.component';

describe('ProjectsComponent project creation permissions', () => {
  let projectService: { getProjects: ReturnType<typeof vi.fn>; createProject: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn>; errorFor: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let canManageTasks: boolean;

  beforeEach(() => {
    canManageTasks = false;
    projectService = { getProjects: vi.fn(() => of([])), createProject: vi.fn(() => of({})) };
    toast = { error: vi.fn(), errorFor: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [
        { provide: AuthService, useValue: { canManageTasks: () => canManageTasks, isAdmin: () => false, currentUser: () => null } },
        { provide: ProjectService, useValue: projectService },
        { provide: ToastService, useValue: toast },
        { provide: UserDirectoryService, useValue: {} }
      ]
    });
  });

  it('blocks a developer from opening project creation', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.componentInstance.openCreateModal();

    expect(fixture.componentInstance.isModalOpen()).toBe(false);
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('blocks a developer from submitting project creation directly', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.componentInstance.saveProject();

    expect(projectService.createProject).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('allows an authorized role to submit project creation', () => {
    canManageTasks = true;
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.componentInstance.newProject.name = 'Project test';

    fixture.componentInstance.saveProject();

    expect(projectService.createProject).toHaveBeenCalledOnce();
  });
});
