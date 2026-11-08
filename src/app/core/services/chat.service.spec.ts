import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';
import { Channel, ChatMessage } from '../models';

function channel(id: string, room: boolean): Channel {
  return room
    ? { id, type: 'TEXT' as const, name: `Sala ${id}`, projectId: `p-${id}`, createdAt: '2026-01-01T00:00:00Z' }
    : { id, type: 'TEXT' as const, name: null, projectId: null, otherUserName: `Vecino ${id}`, createdAt: '2026-01-01T00:00:00Z' };
}

function message(id: string, createdAt: string, body = `msg ${id}`): ChatMessage {
  return { id, body, authorId: 'user-1', authorName: 'Autor', authorEmail: 'autor@example.test', createdAt };
}

describe('ChatService', () => {
  let service: ChatService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('carga la lista de canales en la signal', () => {
    const list = [channel('c-room', true), channel('c-dm', false)];
    let result: Channel[] | undefined;
    service.loadChannels().subscribe(value => result = value);
    http.expectOne('/api/channels').flush(list);
    expect(result).toBe(list);
    expect(service.channels()).toEqual(list);
  });

  it('abre un canal con la página más reciente en orden ascendente', () => {
    service.openChannel('c-room');
    expect(service.activeChannelId()).toBe('c-room');
    const req = http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true');
    expect(req.request.method).toBe('GET');
    // El backend responde en orden descendente; el servicio debe ordenarlo ascendente.
    req.flush([message('m3', '2026-01-01T00:02:00Z'), message('m1', '2026-01-01T00:00:00Z')]);
    expect(service.messages().map(m => m.id)).toEqual(['m1', 'm3']);
    expect(service.hasMoreMessages()).toBe(false);
    service.messages.set([]);
  });

  it('marca paginación adicional cuando la página completa regresó llena', () => {
    service.openChannel('c-room');
    const full = Array.from({ length: 50 }, (_, index) => message(`m-${index}`, `2026-01-01T00:${String(index).padStart(2, '0')}:00Z`));
    http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true').flush(full);
    expect(service.hasMoreMessages()).toBe(true);
    service.messages.set([]);
  });

  it('envía mensajes recortados y los fusiona sin duplicar', () => {
    service.openChannel('c-room');
    http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true').flush([message('m1', '2026-01-01T00:00:00Z')]);
    service.send('  hola mundo  ');
    const req = http.expectOne('/api/channels/c-room/messages');
    expect(req.request.body).toEqual({ body: 'hola mundo' });
    req.flush(message('m2', '2026-01-01T00:01:00Z', 'hola mundo'));
    // El remitente marca su propio mensaje como leído: no ve notificación de sí mismo.
    http.expectOne('/api/channels/c-room/read').flush({});
    expect(service.messages().map(m => m.id)).toEqual(['m1', 'm2']);

    // Un sondeo posterior devuelve el mismo mensaje otra vez: no debe duplicarse.
    service.pollWhenVisible();
    http.expectOne('/api/channels').flush([]);
    http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true').flush([message('m2', '2026-01-01T00:01:00Z', 'hola mundo')]);
    expect(service.messages().map(m => m.id)).toEqual(['m1', 'm2']);
    service.messages.set([]);
  });

  it('descarta la respuesta de un canal ya abandonado', () => {
    service.openChannel('c-dm');
    const dmRequest = http.expectOne('/api/channels/c-dm/messages?limit=50&deliver=true');
    service.openChannel('c-room');
    const roomRequest = http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true');
    roomRequest.flush([message('r1', '2026-01-01T00:05:00Z')]);
    dmRequest.flush([message('d1', '2026-01-01T00:04:00Z')]);
    expect(service.messages().map(m => m.id)).toEqual(['r1']);
    service.messages.set([]);
  });

  it('carga páginas anteriores con el cursor del mensaje más antiguo', () => {
    let firstMessages: ChatMessage[] = [];
    service.openChannel('c-room');
    const full = Array.from({ length: 50 }, (_, index) => message(`m-${index}`, `2026-01-01T00:${String(index).padStart(2, '0')}:00Z`));
    http.expectOne('/api/channels/c-room/messages?limit=50&deliver=true').flush(full.slice().reverse());
    firstMessages = service.messages();
    expect(firstMessages.at(0)?.id).toBe('m-0');

    // scrollTop cerca del inicio dispara la carga con cursor del mensaje más antiguo.
    service.loadOlderMessages();
    const req = http.expectOne(request => request.url === '/api/channels/c-room/messages'
      && request.params.get('before') === 'm-0' && request.params.get('limit') === '50');
    expect(service.loadingOlderMessages()).toBe(true);
    const previous = Array.from({ length: 6 }, (_, index) => message(`old-${index}`, `2025-12-31T00:${String(index).padStart(2, '0')}:00Z`));
    req.flush(previous.slice().reverse());
    expect(service.loadingOlderMessages()).toBe(false);
    expect(service.messages().at(0)?.id).toBe('old-0');
    expect(service.messages().length).toBe(56);
    expect(service.hasMoreMessages()).toBe(false);
    service.messages.set([]);
  });

  it('crea una sala y la inserta en la lista de canales', () => {
    const created = channel('c-new', true);
    service.createChannel({ projectId: 'p1', name: 'QA', type: 'TEXT' }).subscribe(value => {
      expect(value).toBe(created);
    });
    const req = http.expectOne('/api/channels');
    expect(req.request.method).toBe('POST');
    req.flush(created);
    expect(service.channels()).toContain(created);
  });

  it('abre un DM existente y su hilo de mensajes', () => {
    const existing = channel('c-dm', false);
    let result: Channel | undefined;
    service.openDirectChannel('user-2').subscribe(value => result = value);
    const post = http.expectOne('/api/channels/direct');
    expect(post.request.body).toEqual({ memberId: 'user-2' });
    post.flush(existing);
    expect(result).toBe(existing);
    expect(service.channels()).toContain(existing);
    expect(service.activeChannelId()).toBe('c-dm');
    http.expectOne('/api/channels/c-dm/messages?limit=50&deliver=true').flush([]);
  });
});
