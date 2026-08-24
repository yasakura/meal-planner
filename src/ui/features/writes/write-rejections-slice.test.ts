import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { createTestStore } from '../../../test/create-test-store';
import { authStateChanged } from '../auth/auth-slice';
import {
  selectWriteRejected,
  writeRejected,
  writeRejectionDismissed,
} from './write-rejections-slice';

describe('write rejections slice', () => {
  it('un store neuf ne constate aucun refus', () => {
    const store = createTestStore();

    expect(selectWriteRejected(store.getState())).toBe(false);
  });

  it('un refus lève le constat, « Fermer » le solde', () => {
    const store = createTestStore();

    store.dispatch(writeRejected());
    expect(selectWriteRejected(store.getState())).toBe(true);

    store.dispatch(writeRejectionDismissed());
    expect(selectWriteRejected(store.getState())).toBe(false);
  });

  it('la déconnexion emporte le constat : la session suivante n’hérite pas d’un refus qui n’est pas le sien', () => {
    const store = createTestStore();
    store.dispatch(writeRejected());
    expect(selectWriteRejected(store.getState())).toBe(true);

    store.dispatch(authStateChanged(null));

    expect(selectWriteRejected(store.getState())).toBe(false);
  });

  it('une session qui s’ouvre ne solde pas le refus de la session en cours', () => {
    const store = createTestStore();
    store.dispatch(writeRejected());

    store.dispatch(authStateChanged(AccountBuilder.anAccount().build()));

    expect(selectWriteRejected(store.getState())).toBe(true);
  });
});
