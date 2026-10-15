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

  it('refreshes after 401 and retries the original request with the new access token', () => {
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    let result = '';
    client.get<{ value: string }>('/api/tasks').subscribe(response => result = response.value);

    const first = http.expectOne('/api/tasks');
    expect(first.request.headers.get('Authorization')).toBe('Bearer old-token');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush({ accessToken: 'new-token' });
    const retry = http.expectOne('/api/tasks');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ value: 'ok' });

    expect(result).toBe('ok');
    expect(localStorage.getItem('access_token')).toBe('new-token');
  });

  it('routes 402 responses to subscription and surfaces one handled toast', () => {
    const toast = TestBed.inject(ToastService);
    let status = 0;
    client.post('/api/projects', {}).subscribe({ error: error => status = error.status });
    http.expectOne('/api/projects').flush({}, { status: 402, statusText: 'Payment Required' });
    expect(status).toBe(402);
    expect(toast.messages().some(message => message.message.includes('límite de tu plan'))).toBe(true);
  });
});
