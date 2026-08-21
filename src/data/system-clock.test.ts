import { describe, expect, it } from 'vitest';
import { SystemClock } from './system-clock';

function todayAt(iso: string) {
  return SystemClock.create(() => Date.parse(iso)).today();
}

describe('SystemClock', () => {
  it('rend la date parisienne, et non la date UTC, quand les deux diffèrent (heure d’été, +2)', () => {
    expect(todayAt('2026-08-16T22:30:00Z')).toEqual({ year: 2026, month: 8, day: 17 });
  });

  it('applique le décalage d’HIVER (+1) et non celui d’été', () => {
    expect(todayAt('2026-01-15T22:30:00Z')).toEqual({ year: 2026, month: 1, day: 15 });
  });

  it('franchit le réveillon : 31 décembre 23 h 30 UTC est déjà le 1er janvier à Paris', () => {
    expect(todayAt('2026-12-31T23:30:00Z')).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it('rend le jour du changement d’heure d’été (jour de 23 h) sans déborder', () => {
    expect(todayAt('2026-03-29T01:00:00Z')).toEqual({ year: 2026, month: 3, day: 29 });
    expect(todayAt('2026-03-29T23:30:00Z')).toEqual({ year: 2026, month: 3, day: 30 });
  });

  it('rend le jour du changement d’heure d’hiver (jour de 25 h) sans déborder', () => {
    expect(todayAt('2026-10-25T00:30:00Z')).toEqual({ year: 2026, month: 10, day: 25 });
    expect(todayAt('2026-10-25T23:30:00Z')).toEqual({ year: 2026, month: 10, day: 26 });
  });

  it('rend une date civile valide, gelée comme celles du domaine', () => {
    expect(Object.isFrozen(todayAt('2026-08-17T10:00:00Z'))).toBe(true);
  });

  it('relit la source à chaque appel : l’horloge n’est pas figée à sa première lecture', () => {
    const instants = ['2026-08-17T10:00:00Z', '2026-08-18T10:00:00Z'];
    let call = 0;
    const clock = SystemClock.create(() => Date.parse(instants[call++] ?? '2026-01-01T00:00:00Z'));

    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 17 });
    expect(clock.today()).toEqual({ year: 2026, month: 8, day: 18 });
  });

  it('utilise l’horloge système par défaut : une date civile plausible, à un jour près de maintenant', () => {
    const clock = SystemClock.create();

    const today = clock.today();

    const maintenant = Date.UTC(today.year, today.month - 1, today.day);
    expect(Math.abs(maintenant - Date.now())).toBeLessThan(48 * 60 * 60 * 1000);
  });
});
