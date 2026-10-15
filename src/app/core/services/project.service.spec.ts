import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectService } from './project.service';

describe('ProjectService favorites', () => {
  let service: ProjectService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('adds and removes a favorite from the reactive list', () => {
    const project = { id: 'p1', name: 'Roadmap', status: 'ACTIVE' as const };
    service.setFavorite(project, true).subscribe();
    http.expectOne('/api/projects/p1/favorite').flush(null);
    expect(service.isFavorite('p1')).toBe(true);

    service.setFavorite(project, false).subscribe();
    http.expectOne('/api/projects/p1/favorite').flush(null);
    expect(service.isFavorite('p1')).toBe(false);
  });
});
