import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CallService } from './call.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { CallEvent, CallSnapshot } from '../models';

const ME = 'user-me';
const PEER = 'user-peer';

function snapshot(overrides: Partial<CallSnapshot> = {}): CallSnapshot {
  return {
    id: 'call-1',
    channelId: 'chan-1',
    callerId: ME,
    calleeId: PEER,
    state: 'RINGING',
    endReason: null,
    seq: 1,
    createdAt: '2026-11-23T10:00:00',
    ...overrides
  };
}

function event(overrides: Partial<CallEvent> = {}): CallEvent {
  return {
    seq: 1,
    type: 'STATE',
    fromUserId: ME,
    payload: null,
    state: 'RINGING',
    reason: null,
    createdAt: '2026-11-23T10:00:01',
    ...overrides
  };
}

/** Sincroniza las promesas internas (defer, getUserMedia) entre peticiones. */
const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('CallService', () => {
  let service: CallService;
  let http: HttpTestingController;
  let auth: AuthService;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(CallService);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.stopPolling();
    http.verify();
    // Limpia el mediaDevices que alguna prueba haya instalado en navigator.
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });

  /** Simula la sesión iniciada como el usuario indicado. */
  function loginAs(id: string): void {
    auth.loadProfile().subscribe({ error: () => { /* lo comprueba cada prueba */ } });
    http.expectOne('/api/auth/me').flush({ id, email: `${id}@example.test`, fullName: 'Usuario', role: 'DEVELOPER' });
  }

  it('crea la llamada desde el DM y guarda la instantánea como llamante', async () => {
    loginAs(ME);
    let failure: unknown = null;
    service.startCall('chan-1').subscribe({ error: error => failure = error });

    await flushAsync();
    const request = http.expectOne('/api/calls');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ channelId: 'chan-1' });
    request.flush(snapshot());

    expect(failure).toBeNull();
    expect(service.call()?.id).toBe('call-1');
    expect(service.isCaller()).toBe(true);
    expect(service.isCallee()).toBe(false);
    expect(service.starting()).toBe(false);
    service.stopPolling();
  });

  it('no toca el backend si el navegador deniega la cámara', async () => {
    loginAs(ME);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new Error('permiso denegado')) },
      configurable: true
    });

    let failure: unknown = null;
    service.startCall('chan-1').subscribe({ error: error => failure = error });
    await flushAsync();

    expect(failure).toBeInstanceOf(Error);
    expect(service.call()).toBeNull();
    http.expectNone('/api/calls');
  });

  it('sondea los eventos con el cursor propio y lo va avanzando', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());
    service.stopPolling();

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0').flush([event({ seq: 1, state: 'RINGING' })]);
    await flushAsync();

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=1').flush([]);
  });

  it('cierra la llamada y avisa cuando el evento STATE llega con ENDED', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0')
      .flush([event({ seq: 1, type: 'STATE', state: 'ENDED', reason: 'DECLINED' })]);
    await flushAsync();

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
    expect(service.remoteStream()).toBeNull();
    expect(toast.messages().some(item => item.message.includes('rechazado'))).toBe(true);
  });

  it('adopta la llamada entrante cuando soy la persona llamada', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    expect(service.call()?.id).toBe('call-1');
    expect(service.isCallee()).toBe(true);
    expect(service.isCaller()).toBe(false);
    service.stopPolling();
  });

  it('ignora las llamadas de otras personas y las activas sin sesión local', () => {
    loginAs(ME);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot({ calleeId: 'otro-usuario' })]);
    expect(service.call()).toBeNull();

    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot({ state: 'ACTIVE' })]);
    expect(service.call()).toBeNull();
  });

  it('acepta la llamada entrante y el backend la pasa a ACTIVE', async () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);
    service.stopPolling();

    let failure: unknown = null;
    service.acceptCall().subscribe({ error: error => failure = error });
    await flushAsync();

    const answer = http.expectOne('/api/calls/call-1/answer');
    expect(answer.request.method).toBe('POST');
    answer.flush(snapshot({ state: 'ACTIVE', seq: 2 }));

    expect(failure).toBeNull();
    expect(service.call()?.state).toBe('ACTIVE');
    service.stopPolling();
  });

  it('rechaza la llamada entrante y limpia el estado local', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    service.declineCall();
    http.expectOne('/api/calls/call-1/decline').flush(snapshot({ state: 'ENDED', endReason: 'DECLINED' }));

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
  });

  it('cuelga la llamada en curso y limpia el estado local', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.hangUp();
    http.expectOne('/api/calls/call-1/end').flush(snapshot({ state: 'ENDED', endReason: 'FINISHED' }));

    expect(service.call()).toBeNull();
    expect(service.localStream()).toBeNull();
  });

  it('cuelga localmente cuando los eventos devuelven 404 (sesión purgada)', async () => {
    loginAs(ME);
    service.startCall('chan-1').subscribe({ error: () => { /* lo comprueba la prueba */ } });
    await flushAsync();
    http.expectOne('/api/calls').flush(snapshot());

    service.pollEvents();
    http.expectOne('/api/calls/call-1/events?after=0').flush('No encontrado', { status: 404, statusText: 'Not Found' });
    await flushAsync();

    expect(service.call()).toBeNull();
    expect(toast.messages().some(item => item.message.includes('finalizado'))).toBe(true);
  });

  it('no vuelve a mostrar una llamada ya gestionada por el usuario', () => {
    loginAs(PEER);
    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);
    service.declineCall();
    http.expectOne('/api/calls/call-1/decline').flush(snapshot({ state: 'ENDED', endReason: 'DECLINED' }));

    service.refreshActive();
    http.expectOne('/api/calls/active').flush([snapshot()]);

    expect(service.call()).toBeNull();
  });
});
