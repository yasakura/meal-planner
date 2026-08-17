/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENV?: string;
  /**
   * `'true'` en mode e2e UNIQUEMENT (`vite --mode e2e`, cf. `.env.e2e`). Lue en comparaison
   * littérale directement dans `main.tsx` : Vite la remplace par une constante au build, ce
   * qui rend la branche e2e éliminable par Rollup. La passer par une fonction ou un module
   * intermédiaire casserait ce repliage et ferait entrer les adapters e2e en production.
   */
  readonly VITE_E2E?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_USE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
