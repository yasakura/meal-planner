// Outil de dev : vérifie que les Security Rules DÉPLOYÉES autorisent bien ce que les
// adapters `data/` font réellement — lecture et écriture, par collection.
//
// Usage : `npm run check:rules`
//
// Pourquoi il existe alors qu'un test statique couvre déjà les règles :
// `src/test/firestore-rules-coverage.test.ts` croise les collections utilisées dans
// `src/data/**` avec les blocs `match` de `firestore.rules`. Il travaille donc sur le
// FICHIER DU REPO, et rien dans le projet ne pousse ce fichier vers Firebase. Le fichier
// peut être juste et le déploiement en retard : le test resterait vert, et la feature
// serait morte dans le navigateur — exactement le défaut FR-3 qu'on cherche à empêcher.
//
// Ce script, lui, parle au vrai projet. Il est manuel et volontairement hors CI : il
// écrit dans la base dev, et exige des identifiants.
//
// À lancer après tout déploiement de règles, et avant de merger une branche qui ajoute
// une collection.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocsFromServer,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_EMAIL = process.env.SEED_EMAIL ?? 'seedbot@meal-planner-dev.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD;

// Identifiant de sonde : préfixe explicite pour qu'un document oublié se repère d'un
// coup d'œil dans la console Firebase. Jamais un motif `__x__`, réservé par Firestore.
const PROBE_ID = 'zzz-probe-check-rules';

function loadDevEnv() {
  const raw = readFileSync(join(ROOT, '.env.dev'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Les collections que les adapters utilisent réellement, lues dans `src/data/`. */
function collectionsUsedInData() {
  const dir = join(ROOT, 'src', 'data');
  const names = new Set();
  for (const file of readdirRecursive(dir)) {
    const source = readFileSync(file, 'utf8');
    const regex = /\b(?:collection|doc)\(\s*[^,()]+,\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = regex.exec(source)) !== null) names.add(m[1]);
  }
  return [...names].sort();
}

function readdirRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...readdirRecursive(full));
    else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

async function main() {
  if (!SEED_PASSWORD) {
    console.error(
      'REFUS : SEED_PASSWORD non défini.\n' + 'Usage : SEED_PASSWORD=… npm run check:rules',
    );
    process.exit(1);
  }

  const env = loadDevEnv();
  const projectId = env.VITE_FIREBASE_PROJECT_ID;

  // Garde-fou : ce script ÉCRIT. Jamais ailleurs que sur un projet dev.
  if (!projectId || !/dev/i.test(projectId)) {
    console.error(
      `REFUS : le projet ciblé "${projectId}" ne ressemble pas à un projet dev. ` +
        'Ce script écrit des documents de sonde, il est réservé au développement.',
    );
    process.exit(1);
  }

  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  await signInWithEmailAndPassword(getAuth(app), SEED_EMAIL, SEED_PASSWORD);
  const db = getFirestore(app);

  console.log(`Cible : ${projectId}\n`);

  const collections = collectionsUsedInData();
  if (collections.length === 0) {
    console.error('REFUS : aucune collection trouvée dans src/data — le repérage a cassé.');
    process.exit(1);
  }

  let echecs = 0;
  for (const name of collections) {
    // `getDocsFromServer` et non `getDocs` : hors ligne ou règles refusées, `getDocs`
    // sert le cache et ferait passer la sonde pour un succès.
    try {
      const snap = await getDocsFromServer(collection(db, name));
      console.log(`  lecture  ${name.padEnd(12)} OK (${snap.size} doc(s))`);
    } catch (e) {
      console.log(`  lecture  ${name.padEnd(12)} REFUSÉE — ${e.code ?? e.message}`);
      echecs += 1;
    }

    try {
      await setDoc(doc(db, name, PROBE_ID), { probe: true });
      await deleteDoc(doc(db, name, PROBE_ID));
      console.log(`  écriture ${name.padEnd(12)} OK (sonde supprimée)`);
    } catch (e) {
      console.log(`  écriture ${name.padEnd(12)} REFUSÉE — ${e.code ?? e.message}`);
      echecs += 1;
    }
  }

  if (echecs > 0) {
    console.error(
      `\n${echecs} opération(s) refusée(s). Les règles déployées ne couvrent pas ce que ` +
        'les adapters font. Vérifier firestore.rules ET son déploiement.',
    );
    process.exit(1);
  }
  console.log('\nToutes les collections utilisées sont lisibles et inscriptibles.');
  process.exit(0);
}

main().catch((e) => {
  console.error(`ÉCHEC : ${e.code ?? e.message}`);
  process.exit(1);
});
