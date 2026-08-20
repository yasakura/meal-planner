/**
 * Date CIVILE : un jour du calendrier, sans heure et sans fuseau. Ce n'est pas un instant —
 * « le 24 août » ne désigne pas le même intervalle de temps à Paris et à Tokyo, et le menu n'a
 * pas besoin qu'il en désigne un.
 */
export type CalendarDate = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
};

export type CalendarDateProps = {
  year: number;
  month: number;
  day: number;
};

/**
 * Ancrage UTC, et lui seul : un jour UTC dure toujours 24 h, alors qu'un jour local en dure 23
 * ou 25 aux changements d'heure. Toute l'arithmétique civile passe par ici, donc ni le fuseau
 * de la machine ni l'heure d'été ne peuvent décaler un lendemain.
 */
function toUtcInstant(props: CalendarDateProps): Date {
  return new Date(Date.UTC(props.year, props.month - 1, props.day));
}

function fromUtcInstant(instant: Date): CalendarDate {
  return Object.freeze({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  });
}

/**
 * Le contrôle d'existence est un ALLER-RETOUR : `Date.UTC` normalise silencieusement (le
 * 30 février devient le 2 mars, un composant fractionnaire est tronqué, un NaN contamine tout).
 * Si la date relue diffère de celle demandée, le triplet ne désignait aucun jour.
 */
export function createCalendarDate(props: CalendarDateProps): CalendarDate {
  const civil = fromUtcInstant(toUtcInstant(props));
  if (civil.year !== props.year || civil.month !== props.month || civil.day !== props.day) {
    throw new Error('La date civile est invalide');
  }
  return civil;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const instant = toUtcInstant(date);
  instant.setUTCDate(instant.getUTCDate() + days);
  return fromUtcInstant(instant);
}

/** Rang du jour dans la semaine, convention JS : 0 = dimanche … 6 = samedi. */
export function dayOfWeek(date: CalendarDate): number {
  return toUtcInstant(date).getUTCDay();
}

/**
 * Forme d'échange du champ `<input type="date">` : `2026-08-24`, année sur 4 chiffres, mois et
 * quantième sur 2. Le format est HTML, pas métier — mais sa traduction est une règle de
 * calendrier, donc elle vit ici et non dans un container, que la mutation ne couvre pas.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toIsoDate(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/**
 * Deux contrôles, et pas un seul : la FORME (l'expression rationnelle) puis l'EXISTENCE du jour,
 * déléguée à `createCalendarDate`. « 2026-02-30 » passe le premier et échoue au second, comme le
 * ferait le triplet correspondant — un motif ne connaît pas la longueur des mois.
 *
 * Une capture absente rend `undefined`, que `Number` transforme en `NaN` : le triplet est alors
 * rejeté par la factory, exactement comme tout autre composant qui ne désigne rien.
 */
export function parseIsoDate(iso: string): CalendarDate {
  const parts = ISO_DATE.exec(iso);
  if (parts === null) {
    throw new Error('La date civile est invalide');
  }
  const [, year, month, day] = parts;
  return createCalendarDate({ year: Number(year), month: Number(month), day: Number(day) });
}

/**
 * Recule de N mois en CLAMPANT sur le dernier jour du mois d'arrivée. Reculer d'un mois n'est
 * pas soustraire une durée : les mois n'ont pas la même longueur, et le quantième de départ
 * peut n'exister nulle part dans le mois visé. Le 30 avril moins deux mois désigne le 28
 * février, pas le 2 mars — un `setUTCMonth` appliqué à une date de fin de mois déborde
 * silencieusement sur le mois suivant, et ce débordement décalerait toute borne calculée ici.
 *
 * Le 1er du mois d'arrivée sert d'ancrage : aucun quantième ne peut y déborder. Le « jour 0 »
 * du mois suivant est, par convention JS, le dernier jour du mois courant.
 */
export function subtractMonths(date: CalendarDate, months: number): CalendarDate {
  const arrivee = toUtcInstant({ year: date.year, month: date.month - months, day: 1 });
  const dernierJour = new Date(
    Date.UTC(arrivee.getUTCFullYear(), arrivee.getUTCMonth() + 1, 0),
  ).getUTCDate();
  arrivee.setUTCDate(Math.min(date.day, dernierJour));
  return fromUtcInstant(arrivee);
}

/**
 * Comparaison STRICTE : un jour ne se précède pas lui-même. C'est cette strictesse qui rend
 * inclusive une borne exprimée par « purger ce qui est avant ».
 */
export function isBefore(date: CalendarDate, other: CalendarDate): boolean {
  return toUtcInstant(date).getTime() < toUtcInstant(other).getTime();
}
