import { describe, expect, it } from 'vitest';
import { SystemClock } from './system-clock';

function todayAt(iso: string) {
  return SystemClock.create(() => Date.parse(iso)).today();
}

/**
 * Le port `Clock` rend une date CIVILE, celle du fuseau `Europe/Paris` : « quel jour on est »
 * pour l'utilisateur, jamais un instant ni la date UTC. Les instants ci-dessous sont donnés en
 * UTC, donc ces attentes ne dépendent pas du fuseau de la machine qui exécute les tests.
 */
describe('SystemClock', () => {
  it('rend la date parisienne, et non la date UTC, quand les deux diffèrent (heure d’été, +2)', () => {
    // 16 août 22 h 30 UTC = 17 août 00 h 30 à Paris.
    expect(todayAt('2026-08-16T22:30:00Z')).toEqual({ year: 2026, month: 8, day: 17 });
  });

  it('applique le décalage d’HIVER (+1) et non celui d’été', () => {
    // 15 janvier 22 h 30 UTC = 15 janvier 23 h 30 à Paris — encore le 15, pas le 16.
    // Un décalage figé à +2 rendrait le 16 : c'est ce test, avec celui d'août, qui interdit
    // de coder le fuseau en dur.
    expect(todayAt('2026-01-15T22:30:00Z')).toEqual({ year: 2026, month: 1, day: 15 });
  });

  it('franchit le réveillon : 31 décembre 23 h 30 UTC est déjà le 1er janvier à Paris', () => {
    expect(todayAt('2026-12-31T23:30:00Z')).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it('rend le jour du changement d’heure d’été (jour de 23 h) sans déborder', () => {
    // Le 29 mars 2026 à 01 h 00 UTC, Paris vient de sauter de 02 h à 03 h.
    expect(todayAt('2026-03-29T01:00:00Z')).toEqual({ year: 2026, month: 3, day: 29 });
    // 23 h 30 UTC ce même jour : Paris est déjà le 30 (01 h 30).
    expect(todayAt('2026-03-29T23:30:00Z')).toEqual({ year: 2026, month: 3, day: 30 });
  });

  it('rend le jour du changement d’heure d’hiver (jour de 25 h) sans déborder', () => {
    // 25 octobre 2026, 00 h 30 UTC : Paris est à 02 h 30, encore en heure d'été.
    expect(todayAt('2026-10-25T00:30:00Z')).toEqual({ year: 2026, month: 10, day: 25 });
    // 25 octobre 23 h 30 UTC : Paris est repassé en heure d'hiver, 00 h 30 le 26.
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

    // Bornes lâches à dessein : la seule chose vérifiable sans réimplémenter le calcul est que
    // la source par défaut est bien l'heure courante, à la journée près (le fuseau de la
    // machine peut la placer la veille ou le lendemain de la date parisienne).
    const maintenant = Date.UTC(today.year, today.month - 1, today.day);
    expect(Math.abs(maintenant - Date.now())).toBeLessThan(48 * 60 * 60 * 1000);
  });
});
