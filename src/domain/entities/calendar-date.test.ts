import { describe, it, expect } from 'vitest';
import { addDays, createCalendarDate, dayOfWeek, parseIsoDate, toIsoDate } from './calendar-date';

describe('CalendarDate', () => {
  it('se crée valide et expose ses composants civils', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(date).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('retourne une date gelée (immuable au runtime)', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(Object.isFrozen(date)).toBe(true);
  });

  // Une date civile DÉSIGNE un jour du calendrier : un triplet qui n'en désigne aucun n'est pas
  // une date. Le 30 février et le 31 avril sont les cas que seule une vraie règle de calendrier
  // attrape — une simple borne 1..31 les laisserait passer.
  it.each([
    ['30 février (mois court)', { year: 2026, month: 2, day: 30 }],
    ['31 avril (mois de 30 jours)', { year: 2026, month: 4, day: 31 }],
    ['29 février hors année bissextile', { year: 2026, month: 2, day: 29 }],
    ['mois 0', { year: 2026, month: 0, day: 12 }],
    ['mois 13', { year: 2026, month: 13, day: 12 }],
    ['jour 0', { year: 2026, month: 8, day: 0 }],
    ['jour 32', { year: 2026, month: 8, day: 32 }],
    ['jour fractionnaire', { year: 2026, month: 8, day: 24.5 }],
    ['mois fractionnaire', { year: 2026, month: 8.5, day: 24 }],
    ['année fractionnaire', { year: 2026.5, month: 8, day: 24 }],
    ['composant NaN', { year: Number.NaN, month: 8, day: 24 }],
  ])('rejette un triplet qui ne désigne aucun jour du calendrier : %s', (_label, props) => {
    expect(() => createCalendarDate(props)).toThrow('La date civile est invalide');
  });

  it('accepte le 29 février d’une année bissextile', () => {
    const date = createCalendarDate({ year: 2028, month: 2, day: 29 });

    expect(date).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('addDays', () => {
  it('ajoute zéro jour : la date ne bouge pas', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(addDays(date, 0)).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('ajoute un jour : le lendemain', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 8, day: 25 });
  });

  it('ajoute treize jours (dernier jour d’une quinzaine)', () => {
    const date = createCalendarDate({ year: 2026, month: 1, day: 5 });

    expect(addDays(date, 13)).toEqual({ year: 2026, month: 1, day: 18 });
  });

  it('franchit la fin d’un mois', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 31 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 9, day: 1 });
  });

  it('franchit la fin d’une année', () => {
    const date = createCalendarDate({ year: 2026, month: 12, day: 31 });

    expect(addDays(date, 1)).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it('franchit le 29 février d’une année bissextile', () => {
    const date = createCalendarDate({ year: 2028, month: 2, day: 28 });

    expect(addDays(date, 1)).toEqual({ year: 2028, month: 2, day: 29 });
  });

  /**
   * Les deux dates ci-dessous sont les jours de changement d'heure en France : 23 h le 29 mars,
   * 25 h le 25 octobre. Ce que ces deux tests prouvent, c'est que `addDays` ne les traite PAS à
   * part — l'arithmétique est ancrée sur UTC, où tout jour dure 24 h.
   *
   * Ce qu'ils ne prouvent PAS, malgré leur nom d'origine (« franchit le passage à l'heure
   * d'été… ») : attraper une addition en millisecondes sur un instant LOCAL. Un tel défaut
   * n'apparaîtrait que sous un fuseau qui change d'heure ces jours-là, or la suite s'exécute
   * sous `TZ=UTC` (`vitest.config.ts`), qui n'en change jamais. Ces deux tests ne PEUVENT pas
   * rougir sur un changement d'heure : ils tiennent l'ancrage, pas la survie à un fuseau.
   */
  it('ajoute des jours pleins autour du 29 mars, jour de 23 h en France, sans le traiter à part', () => {
    const date = createCalendarDate({ year: 2026, month: 3, day: 28 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 3, day: 29 });
    expect(addDays(date, 2)).toEqual({ year: 2026, month: 3, day: 30 });
  });

  it('ajoute des jours pleins autour du 25 octobre, jour de 25 h en France, sans le traiter à part', () => {
    const date = createCalendarDate({ year: 2026, month: 10, day: 24 });

    expect(addDays(date, 1)).toEqual({ year: 2026, month: 10, day: 25 });
    expect(addDays(date, 2)).toEqual({ year: 2026, month: 10, day: 26 });
  });

  it('rend une date gelée, comme la factory', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    expect(Object.isFrozen(addDays(date, 1))).toBe(true);
  });

  it('ne modifie pas la date reçue', () => {
    const date = createCalendarDate({ year: 2026, month: 8, day: 24 });

    addDays(date, 10);

    expect(date).toEqual({ year: 2026, month: 8, day: 24 });
  });
});

describe('dayOfWeek', () => {
  // Convention JS : 0 = dimanche … 6 = samedi. Les sept jours sont pris pour qu'aucune
  // implémentation décalée d'un cran ne puisse se cacher.
  it.each([
    ['dimanche', { year: 2026, month: 8, day: 23 }, 0],
    ['lundi', { year: 2026, month: 8, day: 24 }, 1],
    ['mardi', { year: 2026, month: 8, day: 25 }, 2],
    ['mercredi', { year: 2026, month: 8, day: 26 }, 3],
    ['jeudi', { year: 2026, month: 8, day: 27 }, 4],
    ['vendredi', { year: 2026, month: 8, day: 28 }, 5],
    ['samedi', { year: 2026, month: 8, day: 29 }, 6],
  ])('rend le rang du jour de la semaine : %s', (_label, props, expected) => {
    expect(dayOfWeek(createCalendarDate(props))).toBe(expected);
  });
});

/**
 * Format d'ÉCHANGE, pas concept métier : `<input type="date">` ne parle que cette chaîne-là.
 * La traduction vit ici, dans l'entité, et non dans un container — un `.tsx` n'est pas muté.
 */
describe('toIsoDate', () => {
  it('rend le format du champ natif : AAAA-MM-JJ', () => {
    expect(toIsoDate(createCalendarDate({ year: 2026, month: 8, day: 24 }))).toBe('2026-08-24');
  });

  // Le champ natif n'accepte QUE la forme à zéros : « 2026-1-5 » ne le renseigne pas.
  it('complète le mois et le quantième par un zéro', () => {
    expect(toIsoDate(createCalendarDate({ year: 2026, month: 1, day: 5 }))).toBe('2026-01-05');
  });
});

describe('parseIsoDate', () => {
  it('relit le format du champ natif', () => {
    expect(parseIsoDate('2026-08-24')).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('relit le 29 février d’une année bissextile', () => {
    expect(parseIsoDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it('rend une date gelée, comme la factory', () => {
    expect(Object.isFrozen(parseIsoDate('2026-08-24'))).toBe(true);
  });

  /**
   * Deux familles d'échecs, et la seconde est celle qu'un contrôle de FORME laisserait passer :
   * « 2026-02-30 » est parfaitement bien formé et ne désigne aucun jour. La chaîne vide est le
   * cas RÉEL du champ natif — c'est ce qu'il rend quand l'utilisateur l'efface.
   */
  it.each([
    ['chaîne vide (le champ natif effacé)', ''],
    ['date partielle', '2026-08'],
    ['séparateurs français', '24/08/2026'],
    ['mois et quantième sans zéro', '2026-8-4'],
    ['horodatage complet', '2026-08-24T00:00:00'],
    ['espace en tête', ' 2026-08-24'],
    ['lettres', 'abcd-ef-gh'],
    ['mois 13', '2026-13-01'],
    ['mois 0', '2026-00-01'],
    ['quantième 32', '2026-08-32'],
    ['quantième 0', '2026-08-00'],
    ['30 février', '2026-02-30'],
    ['31 avril', '2026-04-31'],
    ['29 février hors année bissextile', '2026-02-29'],
  ])('rejette ce qui ne désigne aucun jour du calendrier : %s', (_label, iso) => {
    expect(() => parseIsoDate(iso)).toThrow('La date civile est invalide');
  });
});
