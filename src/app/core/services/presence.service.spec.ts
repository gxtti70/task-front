import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PresenceService } from './presence.service';
import { PresenceEntry, PresenceStatus } from '../models';

describe('PresenceService', () => {
  let service: PresenceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PresenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    service.stop();
  });

  it('setStatus persiste el estado y actualiza las señales locales', () => {
    const userId = 'u-1';
    service.setStatus('BUSY').subscribe(res => {
      expect(res.userId).toBe(userId);
      expect(res.status).toBe('BUSY');
      expect(service.myStatus()).toBe('BUSY');
      expect(service.byUserId().get(userId)?.status).toBe('BUSY');
    });
    const req = http.expectOne('/api/presence/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'BUSY' });
    req.flush({ userId, status: 'BUSY' });
  });

  it('heartbeat envía el indicador de inactividad', () => {
    service.heartbeat();
    const req = http.expectOne('/api/presence/heartbeat');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('refreshPresenceMap pobla byUserId a partir del mapa del backend', () => {
    const now = '2026-11-08T12:00:00Z';
    service.refreshPresenceMap();
    const req = http.expectOne('/api/presence');
    expect(req.request.method).toBe('GET');
    req.flush({
      'u-1': { status: 'AVAILABLE' as PresenceStatus, lastSeenAt: now },
      'u-2': { status: 'DO_NOT_DISTURB' as PresenceStatus, lastSeenAt: null }
    });

    const byUser = service.byUserId();
    expect(byUser.get('u-1')).toEqual<PresenceEntry>({ userId: 'u-1', status: 'AVAILABLE', lastSeenAt: now });
    expect(byUser.get('u-2')).toEqual<PresenceEntry>({ userId: 'u-2', status: 'DO_NOT_DISTURB', lastSeenAt: null });
  });

  it('color y label se derivan de la entrada del usuario', () => {
    service.byUserId.set(new Map([['u-1', { userId: 'u-1', status: 'BUSY', lastSeenAt: null }]]));
    expect(service.color('u-1')).toContain('red');
    expect(service.label('u-1')).toBe('Ocupado');
    expect(service.color('desconocido')).toBe(service.color(null));
  });

  it('isPushSuppressed es verdadero solo para No molestar', () => {
    service.byUserId.set(new Map([
      ['u-dnd', { userId: 'u-dnd', status: 'DO_NOT_DISTURB', lastSeenAt: null }],
      ['u-disp', { userId: 'u-disp', status: 'AVAILABLE', lastSeenAt: null }]
    ]));
    expect(service.isPushSuppressed('u-dnd')).toBe(true);
    expect(service.isPushSuppressed('u-disp')).toBe(false);
    expect(service.isPushSuppressed(null)).toBe(false);
  });

  it('statuses excluye OFFLINE derivado', () => {
    expect(service.statuses).not.toContain('OFFLINE');
    expect(service.statuses).toContain('AVAILABLE');
    expect(service.statuses).toContain('DO_NOT_DISTURB');
  });

  it('lastSeenWhenOffline solo muestra la última conexión de quien está desconectado', () => {
    const now = new Date('2026-11-08T12:00:00Z');
    service.clock.set(now.getTime());
    service.byUserId.set(new Map([
      ['u-off', { userId: 'u-off', status: 'OFFLINE' as PresenceStatus, lastSeenAt: new Date(now.getTime() - 5 * 60_000).toISOString() }],
      ['u-on', { userId: 'u-on', status: 'AVAILABLE' as PresenceStatus, lastSeenAt: now.toISOString() }]
    ]));

    expect(service.isOffline('u-off')).toBe(true);
    expect(service.lastSeenWhenOffline('u-off')).toBe('hace 5 min');
    expect(service.lastSeenTitleWhenOffline('u-off')).toContain('Última conexión:');
    expect(service.lastSeenWhenOffline('u-on')).toBe('');
    expect(service.lastSeenWhenOffline(null)).toBe('');
    expect(service.lastSeenTitleWhenOffline(null)).toBe('');
  });

  it('lastSeenText formatea una marca suelta usando el reloj del servicio', () => {
    const now = new Date('2026-11-08T12:00:00Z');
    service.clock.set(now.getTime());

    expect(service.lastSeenText(new Date(now.getTime() - 2 * 3_600_000).toISOString())).toBe('hace 2 h');
    expect(service.lastSeenText(null)).toBe('');
  });
});
