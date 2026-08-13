/**
 * Promesse dont on garde la main sur le règlement.
 *
 * Sert à prouver les gardes de fraîcheur des slices : sans elle, deux thunks lancés
 * l'un après l'autre se règlent dans leur ordre de lancement, et un test qui ne
 * résout jamais DANS LE DÉSORDRE passerait sans qu'aucune garde n'existe.
 *
 * Infra de test, donc hors périmètre de mutation (`stryker.conf.mjs` exclut les
 * `*.test.ts`, et ce module n'est jamais importé par du code de production).
 */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
