# ADR 0018 — Conventions Playwright : sous-chaîne, zéro réessai, viewport à plat

- **Statut** : en vigueur
- **Date** : 2026-08-17 (`playwright.config.ts`), affiné le 2026-08-19 (`iter-21-passe-playwright`)
- **Portée** : `playwright.config.ts`, `e2e/`, `.github/workflows/ci.yml`

## Contexte

La suite Playwright est la **seule** couche qui exerce l'application assemblée, et le seul filet des
`.tsx` avec la RTL ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)). Ce qu'elle
laisse passer n'est rattrapé par rien.

## Décision et mesures

### `name` cherche une SOUS-CHAÎNE — le piège de nommage

Par défaut, l'option `name` des localisateurs `getByRole` (et `getByText`) fait une correspondance
**par sous-chaîne, insensible à la casse**. Conséquences observées dans ce dépôt :

- `{ name: '← Recette' }` trouvait **« ← Recettes »** : le libellé au singulier n'était plus asserté
  du tout, et le scénario cliquait le mauvais lien ;
- `{ name: 'Menu' }` trouve aussi l'onglet du bas (`nav a[href="/menu"]`) ;
- `getByText('Aucune connexion — le menu n'a pas pu être chargé.')` trouvait aussi
  « l'enregistrement du menu n'a pas pu être confirmé » — deux constats qui ne doivent **jamais**
  pouvoir se répondre l'un pour l'autre.

**Règle** : `exact: true` partout où la distinction porte le scénario. Et quand une occurrence
multiple est **légitime**, l'asserter par son **compte exact** plutôt que par sa présence — par
exemple deux occurrences de « Crème » (la ligne d'ingrédient et la préparation qui la nomme), dont
le compte est justement ce que le défaut contredisait.

### `press()` REFOCALISE, et Chromium replace le curseur en TÊTE

`locator.press()` commence par un `focus()` sur sa cible. Chromium place alors le point d'insertion
**au début** du champ, et non à la fin de la valeur déjà saisie. Un `press('Backspace')` seul
n'efface donc **rien** : le scénario paraît frapper, la valeur ne bouge pas, et ce qu'il croyait
éprouver — ici, qu'un constat survit à la frappe — n'est jamais éprouvé.

**Règle** : faire précéder d'un `press('End')` toute frappe d'édition censée agir sur la fin de la
valeur, et asserter la **valeur obtenue** (`toHaveValue('Zo')`) plutôt que l'effet visé. L'assertion
de valeur est ce qui transforme le piège en échec visible s'il revient.

### `retries: 0`, CI comprise

**Aucune tentative supplémentaire.** Un scénario instable doit se voir comme instable : un
`retries: 1` transforme un vrai défaut de séquence — la classe de bug que cette suite existe pour
attraper — en « flaky » qu'on cesse de lire.

### Viewport écrit à plat

`viewport: { width: 393, height: 852 }` + `deviceScaleFactor` + `isMobile` + `hasTouch`, et **non**
`devices['iPhone 14']` : ce préréglage impose **WebKit**, alors que Chromium est le seul navigateur
installé — et le seul où `isMobile` existe. 393×852 est la résolution sur laquelle les débordements
de mise en page ont été mesurés à la main.

### Le reste de la configuration

- `fullyParallel: true` : chaque scénario ouvre sa propre page, donc son propre store — aucun état
  partagé, la parallélisation est sûre **par construction** ([ADR 0016](0016-mode-e2e-embarque.md)).
- `workers: 1` **en CI seulement**, le runner partageant son CPU avec le serveur Vite. Écrit par
  étalement conditionnel plutôt que `workers: process.env.CI ? 1 : undefined` — `undefined` n'est pas
  une valeur admise sous `exactOptionalPropertyTypes`.
- `reuseExistingServer: !process.env.CI` : en local on réutilise le serveur lancé ; en CI, un serveur
  préexistant serait le signe d'un job mal isolé.
- `forbidOnly` en CI : un `test.only` oublié rendrait la CI verte sur un seul scénario.

## Conséquences

- La suite tourne dans un **job CI séparé** du gate `Lint + Test + Build`, délibérément : un
  scénario navigateur dépend d'un serveur, d'un moteur de rendu et d'horloges qu'on ne maîtrise pas,
  et son instabilité ne doit pas bloquer une PR par ailleurs saine. Il reste un check visible ; la
  décision de l'exiger appartient à la protection de branche, pas au fichier de workflow.
- `npx playwright install --with-deps chromium` en CI : le runner est root, contrairement à un poste
  de développement où cette étape se fait une fois à la main.
- Un scénario e2e rouge relève du protocole **anti test-tampering** : on classifie avant de toucher.
