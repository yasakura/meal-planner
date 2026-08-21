const ELIDING_INITIALS = 'aeiouh';

export function elidedDe(name: string): string {
  const subject = name.trim();
  const initial = subject.normalize('NFD').charAt(0).toLowerCase();
  return ELIDING_INITIALS.includes(initial) ? `d’${subject}` : `de ${subject}`;
}
