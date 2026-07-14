import { auth } from '../../config/firebase';
import { FirebaseAuthGateway } from '../../data/firebase-auth-gateway';
import { createStore } from './store';

// Composition root : la couche ui/ est la seule autorisée à câbler les adapters
// data/ dans le store (les autres couches restent découplées via les ports).
export function createAppStore() {
  return createStore({ authGateway: FirebaseAuthGateway.create(auth) });
}
