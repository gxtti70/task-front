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
