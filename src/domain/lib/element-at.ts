export function elementAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error('Index hors des bornes du tableau');
  }
  return item;
}
