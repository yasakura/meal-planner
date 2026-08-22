export function requireEnv(value: string | undefined, name: string): string {
  if (value === undefined || value === '') {
    throw new Error(`Variable d'environnement Firebase manquante : ${name}`);
  }
  return value;
}
