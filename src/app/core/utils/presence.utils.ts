import { PresenceStatus } from '../models';

/** Etiqueta legible en español para cada estado de presencia. */
export function presenceLabel(status: PresenceStatus): string {
  const labels: Record<PresenceStatus, string> = {
    AVAILABLE: 'Disponible',
    BUSY: 'Ocupado',
    DO_NOT_DISTURB: 'No molestar',
    BE_RIGHT_BACK: 'Vuelvo enseguida',
    AWAY: 'Ausente',
    OUT_OF_OFFICE: 'Fuera de la oficina',
    APPEAR_OFFLINE: 'Parecer desconectado',
    OFFLINE: 'Desconectado',
  };
  return labels[status] ?? 'Desconectado';
}

/** Clase de color del punto de presencia (aplicable a bg-*). */
export function presenceDotColor(status: PresenceStatus): string {
  const colors: Record<PresenceStatus, string> = {
    AVAILABLE: 'bg-green-400',
    BUSY: 'bg-red-500',
    DO_NOT_DISTURB: 'bg-red-700',
    BE_RIGHT_BACK: 'bg-amber-400',
    AWAY: 'bg-yellow-400',
    OUT_OF_OFFICE: 'bg-violet-500',
    APPEAR_OFFLINE: 'bg-zinc-400',
    OFFLINE: 'bg-zinc-500',
  };
  return colors[status] ?? 'bg-zinc-500';
}

/** Icono de Lucide que acompaña al estado en el selector (vacío = sin icono). */
export function presenceIcon(status: PresenceStatus): string {
  const icons: Record<PresenceStatus, string> = {
    AVAILABLE: '',
    BUSY: '',
    DO_NOT_DISTURB: 'circle-slash',
    BE_RIGHT_BACK: 'clock',
    AWAY: 'clock',
    OUT_OF_OFFICE: 'briefcase',
    APPEAR_OFFLINE: 'circle-off',
    OFFLINE: 'power-off',
  };
  return icons[status] ?? '';
}

/** Estados que el usuario puede establecer manualmente (OFFLINE es derivado). */
export function manualPresenceStatuses(): PresenceStatus[] {
  return [
    'AVAILABLE', 'BUSY', 'DO_NOT_DISTURB', 'BE_RIGHT_BACK',
    'AWAY', 'OUT_OF_OFFICE', 'APPEAR_OFFLINE',
  ];
}

/** Orden del selector: primero los más usados. */
export function orderedPresenceStatuses(): PresenceStatus[] {
  return [
    'AVAILABLE', 'BUSY', 'DO_NOT_DISTURB', 'BE_RIGHT_BACK',
    'AWAY', 'OUT_OF_OFFICE', 'APPEAR_OFFLINE',
  ];
}

/** Indica si el estado suprime notificaciones push para el destinatario. */
export function suppressesPush(status: PresenceStatus): boolean {
  return status === 'DO_NOT_DISTURB';
}

/** Convierte una marca ISO en milisegundos, o null si no es válida. */
function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Tiempo transcurrido desde la última conexión, en texto corto.
 * Ejemplos: "hace un momento", "hace 5 min", "hace 2 h", "ayer", "hace 3 días".
 */
export function lastSeenRelative(value: string | null | undefined, now = Date.now()): string {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return '';

  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'hace un momento';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;

  const formatted = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(timestamp));
  return `el ${formatted}`;
}

/** Fecha y hora exactas de la última conexión, para el tooltip. */
export function lastSeenTooltip(value: string | null | undefined): string {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return '';
  const formatted = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(timestamp));
  return `Última conexión: ${formatted}`;
}
