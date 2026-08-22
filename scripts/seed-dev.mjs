// Outil de dev : RESET de la base dev — vide les collections `recipes` et `convives`, puis insère
// 20 recettes simples et les 4 convives du foyer de dev.
// Usage : `npm run seed:dev`  (ou `node scripts/seed-dev.mjs`)
//
// - Lit la config Firebase depuis `.env.dev` (jamais `.env.prod`).
// - Garde-fou : refuse si le projet ciblé ne ressemble pas à un projet `dev`.
// - Les règles Firestore exigent un utilisateur authentifié → utilise un compte de seed
//   dédié (créé au premier run). Override possible via SEED_EMAIL / SEED_PASSWORD.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_EMAIL = process.env.SEED_EMAIL ?? 'seedbot@meal-planner-dev.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'SeedBot-2026!';

// --- Config depuis .env.dev -------------------------------------------------
function loadDevEnv() {
  const raw = readFileSync(join(ROOT, '.env.dev'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// --- Recettes « fait simple » (unités domaine : g | kg | ml | l | piece) ----
const RECIPES = [
  { title: 'Pâtes au beurre', convivesReference: 4, ingredients: [
    { name: 'Pâtes', quantity: 500, unit: 'g' },
    { name: 'Beurre', quantity: 50, unit: 'g' },
    { name: 'Parmesan', quantity: 50, unit: 'g' },
  ], instructions: 'Cuire les pâtes 10 min. Égoutter, mélanger au beurre et au parmesan.' },

  { title: 'Omelette nature', convivesReference: 4, ingredients: [
    { name: 'Œufs', quantity: 8, unit: 'piece' },
    { name: 'Beurre', quantity: 20, unit: 'g' },
  ], instructions: 'Battre les œufs. Cuire dans le beurre à feu moyen, plier et servir.' },

  { title: 'Riz cantonais', convivesReference: 4, ingredients: [
    { name: 'Riz', quantity: 300, unit: 'g' },
    { name: 'Œufs', quantity: 3, unit: 'piece' },
    { name: 'Petits pois', quantity: 150, unit: 'g' },
    { name: 'Jambon', quantity: 200, unit: 'g' },
  ] },

  { title: 'Salade de tomates', convivesReference: 4, ingredients: [
    { name: 'Tomates', quantity: 6, unit: 'piece' },
    { name: "Huile d'olive", quantity: 30, unit: 'ml' },
    { name: 'Oignon', quantity: 1, unit: 'piece' },
  ] },

  { title: 'Croque-monsieur', convivesReference: 4, ingredients: [
    { name: 'Pain de mie', quantity: 8, unit: 'piece' },
    { name: 'Jambon', quantity: 4, unit: 'piece' },
    { name: 'Fromage râpé', quantity: 200, unit: 'g' },
  ], instructions: 'Garnir de jambon et fromage. Passer au four 10 min à 200°C.' },

  { title: 'Soupe de légumes', convivesReference: 4, ingredients: [
    { name: 'Carottes', quantity: 4, unit: 'piece' },
    { name: 'Poireaux', quantity: 2, unit: 'piece' },
    { name: 'Pommes de terre', quantity: 3, unit: 'piece' },
  ], instructions: "Éplucher, couper, couvrir d'eau, cuire 25 min puis mixer." },

  { title: 'Steak haché frites', convivesReference: 4, ingredients: [
    { name: 'Steak haché', quantity: 4, unit: 'piece' },
    { name: 'Pommes de terre', quantity: 800, unit: 'g' },
  ] },

  { title: 'Quiche lorraine', convivesReference: 4, ingredients: [
    { name: 'Pâte brisée', quantity: 1, unit: 'piece' },
    { name: 'Lardons', quantity: 200, unit: 'g' },
    { name: 'Œufs', quantity: 3, unit: 'piece' },
    { name: 'Crème', quantity: 200, unit: 'ml' },
  ], instructions: 'Garnir la pâte, verser œufs battus + crème + lardons. Four 35 min à 180°C.' },

  { title: 'Poulet rôti', convivesReference: 4, ingredients: [
    { name: 'Poulet', quantity: 1, unit: 'piece' },
    { name: 'Pommes de terre', quantity: 800, unit: 'g' },
  ] },

  { title: 'Gratin de pâtes', convivesReference: 4, ingredients: [
    { name: 'Pâtes', quantity: 400, unit: 'g' },
    { name: 'Jambon', quantity: 200, unit: 'g' },
    { name: 'Fromage râpé', quantity: 150, unit: 'g' },
    { name: 'Crème', quantity: 200, unit: 'ml' },
  ] },

  { title: 'Ratatouille', convivesReference: 4, ingredients: [
    { name: 'Courgettes', quantity: 2, unit: 'piece' },
    { name: 'Aubergine', quantity: 1, unit: 'piece' },
    { name: 'Tomates', quantity: 4, unit: 'piece' },
    { name: 'Poivron', quantity: 2, unit: 'piece' },
  ] },

  { title: 'Purée jambon', convivesReference: 4, ingredients: [
    { name: 'Pommes de terre', quantity: 1, unit: 'kg' },
    { name: 'Lait', quantity: 200, unit: 'ml' },
    { name: 'Beurre', quantity: 40, unit: 'g' },
    { name: 'Jambon', quantity: 4, unit: 'piece' },
  ] },

  { title: 'Salade César', convivesReference: 4, ingredients: [
    { name: 'Salade', quantity: 1, unit: 'piece' },
    { name: 'Poulet', quantity: 300, unit: 'g' },
    { name: 'Parmesan', quantity: 50, unit: 'g' },
    { name: 'Croûtons', quantity: 100, unit: 'g' },
  ] },

  { title: 'Tacos poulet', convivesReference: 4, ingredients: [
    { name: 'Tortillas', quantity: 6, unit: 'piece' },
    { name: 'Poulet', quantity: 400, unit: 'g' },
    { name: 'Cheddar', quantity: 150, unit: 'g' },
  ] },

  { title: 'Poêlée de légumes', convivesReference: 4, ingredients: [
    { name: 'Courgettes', quantity: 3, unit: 'piece' },
    { name: 'Carottes', quantity: 3, unit: 'piece' },
    { name: 'Oignon', quantity: 1, unit: 'piece' },
  ] },

  { title: 'Spaghetti bolognaise', convivesReference: 4, ingredients: [
    { name: 'Spaghetti', quantity: 500, unit: 'g' },
    { name: 'Viande hachée', quantity: 400, unit: 'g' },
    { name: 'Sauce tomate', quantity: 400, unit: 'g' },
    { name: 'Oignon', quantity: 1, unit: 'piece' },
  ], instructions: 'Revenir oignon + viande, ajouter la sauce, mijoter 20 min. Servir sur les pâtes.' },

  { title: 'Œufs cocotte', convivesReference: 4, ingredients: [
    { name: 'Œufs', quantity: 4, unit: 'piece' },
    { name: 'Crème', quantity: 100, unit: 'ml' },
    { name: 'Fromage râpé', quantity: 80, unit: 'g' },
  ] },

  { title: 'Sandwich thon', convivesReference: 4, ingredients: [
    { name: 'Pain', quantity: 4, unit: 'piece' },
    { name: 'Thon', quantity: 200, unit: 'g' },
    { name: 'Mayonnaise', quantity: 40, unit: 'g' },
    { name: 'Salade', quantity: 1, unit: 'piece' },
  ] },

  { title: 'Riz au thon', convivesReference: 4, ingredients: [
    { name: 'Riz', quantity: 300, unit: 'g' },
    { name: 'Thon', quantity: 200, unit: 'g' },
    { name: 'Maïs', quantity: 150, unit: 'g' },
    { name: 'Tomates', quantity: 3, unit: 'piece' },
  ] },

  { title: 'Galettes de pommes de terre', convivesReference: 4, ingredients: [
    { name: 'Pommes de terre', quantity: 600, unit: 'g' },
    { name: 'Œufs', quantity: 2, unit: 'piece' },
    { name: 'Farine', quantity: 50, unit: 'g' },
  ], instructions: 'Râper les pommes de terre, mélanger œufs + farine, poêler en galettes.' },
];

// --- Convives du foyer de dev (forme du document : cf. `documentToConvive`, convive-mapper.ts) --
const CONVIVES = [{ name: 'Camille' }, { name: 'Naïm' }, { name: 'Salomé' }, { name: 'Théo' }];

async function main() {
  const env = loadDevEnv();
  const projectId = env.VITE_FIREBASE_PROJECT_ID;

  // Garde-fou : jamais autre chose qu'un projet dev.
  if (!projectId || !/dev/i.test(projectId)) {
    console.error(
      `REFUS : le projet ciblé "${projectId}" ne ressemble pas à un projet dev. ` +
        'Ce script est réservé au reset de la base de développement.',
    );
    process.exit(1);
  }

  console.log(`Cible : ${projectId}`);
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Auth : réutiliser le compte de seed, le créer sinon.
  try {
    await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD);
    console.log(`Auth : connecté (${SEED_EMAIL}).`);
  } catch (e) {
    console.log(`Auth : signIn échoué (${e.code ?? e.message}), création du compte de seed…`);
    await createUserWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD);
    console.log(`Auth : compte de seed créé (${SEED_EMAIL}).`);
  }

  // 1) Vider la collection `recipes`.
  const snap = await getDocs(collection(db, 'recipes'));
  console.log(`Suppression : ${snap.size} recette(s) existante(s)…`);
  for (const d of snap.docs) await deleteDoc(d.ref);

  // 2) Insérer les recettes.
  console.log(`Insertion : ${RECIPES.length} recettes…`);
  for (const r of RECIPES) {
    await addDoc(collection(db, 'recipes'), r);
    console.log(`  + ${r.title}`);
  }

  // 3) Vider la collection `convives`.
  const convivesSnap = await getDocs(collection(db, 'convives'));
  console.log(`Suppression : ${convivesSnap.size} convive(s) existant(s)…`);
  for (const d of convivesSnap.docs) await deleteDoc(d.ref);

  // 4) Insérer les convives.
  console.log(`Insertion : ${CONVIVES.length} convives…`);
  for (const c of CONVIVES) {
    await addDoc(collection(db, 'convives'), c);
    console.log(`  + ${c.name}`);
  }

  // 5) Vérification.
  const after = await getDocs(collection(db, 'recipes'));
  const convivesAfter = await getDocs(collection(db, 'convives'));
  console.log(`\nOK — ${after.size} recette(s) et ${convivesAfter.size} convive(s) en base.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('ÉCHEC :', e.code ?? '', e.message);
  process.exit(1);
});
