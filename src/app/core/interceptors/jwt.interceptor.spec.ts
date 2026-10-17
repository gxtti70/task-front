import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jwtInterceptor } from './jwt.interceptor';
import { ToastService } from '../services/toast.service';

describe('jwtInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(), { provide: Router, useValue: { navigate: vi.fn() } }] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('rotates the HttpOnly refresh cookie after 401 and retries without a bearer token', () => {
    let result = '';
    client.get<{ value: string }>('/api/tasks').subscribe(response => result = response.value);

    const first = http.expectOne('/api/tasks');
    expect(first.request.headers.has('Authorization')).toBe(false);
    expect(first.request.withCredentials).toBe(true);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    http.expectOne('/api/auth/csrf').flush('csrf-token');
    const refresh = http.expectOne('/api/auth/refresh');
    expect(refresh.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ refreshed: true });

    const retry = http.expectOne('/api/tasks');
    expect(retry.request.headers.has('Authorization')).toBe(false);
    expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    retry.flush({ value: 'ok' });
    expect(result).toBe('ok');
  });

  it('attaches CSRF header to mutating requests', () => {
    client.post('/api/projects', {}).subscribe();
    http.expectOne('/api/auth/csrf').flush('csrf-value');
    const request = http.expectOne('/api/projects');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-value');
    request.flush({});
  });

  it('does not rotate the session for a 403 CSRF or authorization failure', () => {
    let status = 0;
    client.get('/api/tasks').subscribe({ error: error => status = error.status });
    http.expectOne('/api/tasks').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone('/api/auth/csrf');
    http.expectNone('/api/auth/refresh');
    expect(status).toBe(403);
  });

  it('routes 402 responses to subscription and surfaces one handled toast', () => {
    const toast = TestBed.inject(ToastService);
    let status = 0;
    client.post('/api/projects', {}).subscribe({ error: error => status = error.status });
    http.expectOne('/api/auth/csrf').flush('csrf-value');
    http.expectOne('/api/projects').flush({}, { status: 402, statusText: 'Payment Required' });
    expect(status).toBe(402);
    expect(toast.messages().some(message => message.message.includes('límite de tu plan'))).toBe(true);
  });
});
