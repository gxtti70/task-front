import { describe, expect, it } from 'vitest';
import { lastSeenRelative, lastSeenTooltip } from './presence.utils';

const NOW = new Date('2026-11-08T12:00:00Z').getTime();

function at(millisecondsAgo: number): string {
  return new Date(NOW - millisecondsAgo).toISOString();
}

describe('lastSeenRelative', () => {
  it('usa "hace un momento" para marcas muy recientes', () => {
    expect(lastSeenRelative(at(30_000), NOW)).toBe('hace un momento');
  });

  it('usa minutos, horas y días según la distancia', () => {
    expect(lastSeenRelative(at(5 * 60_000), NOW)).toBe('hace 5 min');
    expect(lastSeenRelative(at(2 * 3_600_000), NOW)).toBe('hace 2 h');
    expect(lastSeenRelative(at(26 * 3_600_000), NOW)).toBe('ayer');
    expect(lastSeenRelative(at(3 * 86_400_000), NOW)).toBe('hace 3 días');
  });

  it('usa la fecha exacta cuando es más de una semana', () => {
    const text = lastSeenRelative(at(30 * 86_400_000), NOW);
    expect(text.startsWith('el ')).toBe(true);
    expect(text).toContain('2026');
  });

  it('devuelve vacío si no hay marca o la marca es inválida', () => {
    expect(lastSeenRelative(null, NOW)).toBe('');
    expect(lastSeenRelative(undefined, NOW)).toBe('');
    expect(lastSeenRelative('no-es-una-fecha', NOW)).toBe('');
  });

  it('tolera marcas en el futuro por desfase de reloj', () => {
    expect(lastSeenRelative(new Date(NOW + 60_000).toISOString(), NOW)).toBe('hace un momento');
  });
});

describe('lastSeenTooltip', () => {
  it('incluye la fecha y la hora exactas', () => {
    const tooltip = lastSeenTooltip('2026-11-08T12:00:00');
    expect(tooltip.startsWith('Última conexión: ')).toBe(true);
    expect(tooltip).toContain('12:00');
  });

  it('devuelve vacío si no hay marca válida', () => {
    expect(lastSeenTooltip(null)).toBe('');
    expect(lastSeenTooltip('no-es-una-fecha')).toBe('');
  });
});
