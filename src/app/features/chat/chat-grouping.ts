import { ChatMessage } from '../../core/models';

/** Mensajes consecutivos del mismo autor dentro de esta ventana comparten cabecera. */
export const MESSAGE_GROUP_WINDOW_MS = 5 * 60_000;

const MAX_IMAGES_PER_GRID = 4;

interface ChatDisplayItemBase {
  id: string;
  /** Muestra avatar + nombre + hora: solo el primer mensaje del grupo. */
  showMeta: boolean;
  /** Indica si toca dibujar avatar; el template lo omite siempre en mensajes propios. */
  showAvatar: boolean;
  startsGroup: boolean;
  /** Último mensaje del grupo: conserva la cola de la burbuja y el tick de recibo. */
  endsGroup: boolean;
}

export type ChatDisplayItem =
  | (ChatDisplayItemBase & { type: 'message'; message: ChatMessage })
  | (ChatDisplayItemBase & { type: 'image-grid'; messages: ChatMessage[] });

export function isImageMessage(message: ChatMessage): boolean {
  return message.messageType === 'FILE'
    && !!message.fileContentType?.startsWith('image/')
    && !!message.downloadUrl;
}

function authorOf(item: ChatDisplayItem): string {
  return item.type === 'image-grid' ? item.messages[0].authorId : item.message.authorId;
}

function firstCreatedAt(item: ChatDisplayItem): string {
  return item.type === 'image-grid' ? item.messages[0].createdAt : item.message.createdAt;
}

function lastCreatedAt(item: ChatDisplayItem): string {
  return item.type === 'image-grid'
    ? item.messages[item.messages.length - 1].createdAt
    : item.message.createdAt;
}

function isSameCalendarDay(left: string, right: string): boolean {
  const a = new Date(left);
  const b = new Date(right);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Construye la lista visual del chat: agrupa imágenes consecutivas y calcula
 * qué mensajes comparten cabecera de autor dentro de una ventana de tiempo.
 */
export function buildChatDisplayItems(messages: ChatMessage[]): ChatDisplayItem[] {
  const items: ChatDisplayItem[] = [];

  for (let index = 0; index < messages.length;) {
    const message = messages[index];
    if (!isImageMessage(message)) {
      items.push({
        type: 'message',
        id: message.id,
        message,
        showMeta: true,
        showAvatar: true,
        startsGroup: true,
        endsGroup: true
      });
      index += 1;
      continue;
    }

    const images = [message];
    let next = index + 1;
    while (next < messages.length
      && images.length < MAX_IMAGES_PER_GRID
      && isImageMessage(messages[next])
      && messages[next].authorId === message.authorId) {
      images.push(messages[next]);
      next += 1;
    }

    if (images.length > 1) {
      items.push({
        type: 'image-grid',
        id: message.id,
        messages: images,
        showMeta: true,
        showAvatar: true,
        startsGroup: true,
        endsGroup: true
      });
    } else {
      items.push({
        type: 'message',
        id: message.id,
        message,
        showMeta: true,
        showAvatar: true,
        startsGroup: true,
        endsGroup: true
      });
    }
    index = next;
  }

  markGroups(items);
  return items;
}

function markGroups(items: ChatDisplayItem[]): void {
  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const previous = items[index - 1];
    const startsGroup = !previous || !belongsToSameGroup(previous, current);
    current.startsGroup = startsGroup;
    current.showMeta = startsGroup;
    current.showAvatar = startsGroup;
  }

  for (let index = 0; index < items.length; index += 1) {
    items[index].endsGroup = index === items.length - 1 || items[index + 1].startsGroup;
  }
}

function belongsToSameGroup(previous: ChatDisplayItem, current: ChatDisplayItem): boolean {
  if (authorOf(previous) !== authorOf(current)) return false;

  const previousTime = Date.parse(lastCreatedAt(previous));
  const currentTime = Date.parse(firstCreatedAt(current));
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) return false;

  const gap = currentTime - previousTime;
  if (gap < 0 || gap > MESSAGE_GROUP_WINDOW_MS) return false;

  return isSameCalendarDay(lastCreatedAt(previous), firstCreatedAt(current));
}
