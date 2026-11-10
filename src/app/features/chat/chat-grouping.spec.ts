import { describe, expect, it } from 'vitest';
import { ChatMessage } from '../../core/models';
import { buildChatDisplayItems } from './chat-grouping';

/** Construye una fecha local para que la comparación por día no dependa de la zona horaria. */
function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 0, day, hour, minute, 0).toISOString();
}

function message(
  id: string,
  authorId: string,
  createdAt: string,
  overrides: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id,
    body: `Mensaje ${id}`,
    authorId,
    authorName: authorId === 'self' ? 'Self User' : 'Other User',
    authorEmail: `${authorId}@example.test`,
    createdAt,
    messageType: 'TEXT',
    ...overrides
  };
}

function image(id: string, authorId: string, createdAt: string): ChatMessage {
  return message(id, authorId, createdAt, {
    messageType: 'FILE',
    fileContentType: 'image/png',
    fileName: `${id}.png`,
    downloadUrl: `https://files.test/${id}.png`
  });
}

describe('buildChatDisplayItems', () => {
  it('agrupa mensajes consecutivos del mismo autor dentro de la ventana', () => {
    const items = buildChatDisplayItems([
      message('m1', 'other', at(2, 10, 0)),
      message('m2', 'other', at(2, 10, 2)),
      message('m3', 'other', at(2, 10, 4))
    ]);

    expect(items.map(item => item.showMeta)).toEqual([true, false, false]);
    expect(items.map(item => item.showAvatar)).toEqual([true, false, false]);
    expect(items.map(item => item.startsGroup)).toEqual([true, false, false]);
    expect(items.map(item => item.endsGroup)).toEqual([false, false, true]);
  });

  it('abre un grupo nuevo cuando el salto supera la ventana de cinco minutos', () => {
    const items = buildChatDisplayItems([
      message('m1', 'other', at(2, 10, 0)),
      message('m2', 'other', at(2, 10, 6))
    ]);

    expect(items.map(item => item.showMeta)).toEqual([true, true]);
    expect(items.map(item => item.startsGroup)).toEqual([true, true]);
    expect(items.map(item => item.endsGroup)).toEqual([true, true]);
  });

  it('abre un grupo nuevo al cambiar de autor', () => {
    const items = buildChatDisplayItems([
      message('m1', 'other', at(2, 10, 0)),
      message('m2', 'self', at(2, 10, 1)),
      message('m3', 'other', at(2, 10, 2))
    ]);

    expect(items.map(item => item.showMeta)).toEqual([true, true, true]);
  });

  it('abre un grupo nuevo al cambiar de día aunque pasen menos de cinco minutos', () => {
    const items = buildChatDisplayItems([
      message('m1', 'other', at(2, 23, 58)),
      message('m2', 'other', at(3, 0, 1))
    ]);

    expect(items.map(item => item.showMeta)).toEqual([true, true]);
  });

  it('agrupa imágenes consecutivas del mismo autor en una cuadrícula', () => {
    const items = buildChatDisplayItems([
      image('i1', 'other', at(2, 10, 0)),
      image('i2', 'other', at(2, 10, 1)),
      message('m1', 'other', at(2, 10, 2))
    ]);

    expect(items).toHaveLength(2);
    const grid = items[0];
    expect(grid.type).toBe('image-grid');
    if (grid.type !== 'image-grid') return;
    expect(grid.messages).toHaveLength(2);
    expect(grid.showMeta).toBe(true);
    expect(grid.endsGroup).toBe(false);

    const text = items[1];
    expect(text.type).toBe('message');
    expect(text.showMeta).toBe(false);
    expect(text.endsGroup).toBe(true);
  });

  it('limita la cuadrícula a cuatro imágenes', () => {
    const items = buildChatDisplayItems([
      image('i1', 'other', at(2, 10, 0)),
      image('i2', 'other', at(2, 10, 1)),
      image('i3', 'other', at(2, 10, 2)),
      image('i4', 'other', at(2, 10, 3)),
      image('i5', 'other', at(2, 10, 4))
    ]);

    expect(items).toHaveLength(2);
    const grid = items[0];
    expect(grid.type).toBe('image-grid');
    if (grid.type !== 'image-grid') return;
    expect(grid.messages).toHaveLength(4);
    expect(items[1].type).toBe('message');
    expect(items[1].showMeta).toBe(false);
  });
});
