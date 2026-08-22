# ADR 0029 — Deux provenances de menu, parce qu'il y a deux écrans de menu

- **Statut** : en vigueur
- **Date** : 2026-08-22 (branche `iter-34-vue-generation`)
- **Portée** : `src/ui/features/recipe-detail/recipe-detail-origin.ts`, `src/ui/features/menu/menu-days.ts`

## Contexte

L'écran Menu s'est scindé en deux routes : `/menu` consulte les menus enregistrés, `/menu/nouveau`
compose un brouillon qui n'existe qu'en mémoire. Les deux affichent une liste de repas, et **les
deux** produisent des liens vers les fiches recette.

La provenance `?depuis=menu` de l'[ADR 0022](0022-la-provenance-vit-dans-l-url.md) datait de l'écran
unique. Après la scission, elle ramenait tout le monde à `/menu` — donc un utilisateur parti d'un
brouillon revenait sur la consultation, sans son brouillon sous les yeux. Le brouillon n'était pas
perdu, mais il fallait le retrouver par le « + ». Constaté par quatre scénarios Playwright de
`Du menu à la fiche recette`, restés rouges le temps de l'arbitrage : leur nom promet « revenir au
menu **tel qu'il était** », et le retour unique ne le tenait plus.

## Décision

**Une provenance par écran producteur d'adresses**, et non un retour unique vers le menu.

| Écran           | Suffixe                | Retour          |
| --------------- | ---------------------- | --------------- |
| `/menu`         | `?depuis=menu`         | `/menu`         |
| `/menu/nouveau` | `?depuis=menu-nouveau` | `/menu/nouveau` |
| `/catalogue`    | aucun                  | `/catalogue`    |

L'alternative — garder `?depuis=menu` et ramener toujours à `/menu` — a été écartée : un lien
« ← Menu » qui ne ramène pas d'où l'on vient est un mensonge d'écran, et il coûte à l'utilisateur le
geste de reconstituer sa place. Le prix payé est un troisième cas dans la provenance, c'est-à-dire
exactement ce que la forme de l'ADR 0022 était faite pour absorber.

### Ce que l'ADR 0022 étend, et ce qu'elle ne change pas

Les deux propriétés de forme tiennent, et c'est ce qui rend l'extension bon marché :

- **les deux moitiés vivent dans le même module** : `recipe-detail-origin.ts` fabrique
  `?depuis=menu-nouveau` **et** le relit. Aucun appelant n'écrit ce littéral ; le module de la
  génération (`menu-slice.ts`) reçoit `FROM_MENU_DRAFT` et n'en connaît que le nom ;
- **les fabriques d'adresses restent des méthodes DE la provenance**. `menuDays` fabriquait ses liens
  avec `FROM_MENU` en dur : c'était la seule façon d'oublier la provenance, et la scission l'aurait
  rendue fausse en silence. `menuDays(menu, recipes, origin)` **prend** désormais la provenance, donc
  chacun des deux slices déclare la sienne et aucun ne peut l'omettre.

Le libellé du retour reste **« ← Menu »** dans les deux cas : il nomme la destination telle que
l'utilisateur la voit — le menu qu'il regardait —, pas la route. Les deux se distinguent par leur
`href`, jamais par leur texte, et aucun écran ne montre les deux à la fois.

### Une provenance inconnue ou absente n'est pas une erreur

C'est le cas ordinaire d'un **lien collé**, d'un **signet**, ou d'une adresse survivant à un
renommage. La règle de l'ADR 0022 est inchangée : le défaut est le **catalogue**, le seul qui ne
mente pas. `?depuis=lune` et `/catalogue/r1` rendent le même retour « ← Recettes ».

**La forme du repli compte.** La première écriture indexait un objet littéral
(`PROVENANCES[depuis] ?? FROM_CATALOGUE`) — et `?depuis=constructor` rendait alors
`Object.prototype.constructor`, une fonction, que `??` laisse passer : la fiche cherchait le
`backLink` d'un constructeur et n'affichait plus de retour du tout. Un test rouge l'a montré avant
correction. La comparaison est donc **explicite**, jamais une indexation :

```ts
export function originOf(params: URLSearchParams): Origin {
  const depuis = params.get(DEPUIS);
  if (depuis === MENU) return FROM_MENU;
  if (depuis === MENU_BROUILLON) return FROM_MENU_DRAFT;
  return FROM_CATALOGUE;
}
```

### Une provenance qui déclenche un geste est à USAGE UNIQUE

`?depuis=…` **décrit** un parcours : la relire dix fois donne dix fois la même fiche, et elle a
vocation à rester dans l'adresse. `?enregistre` (`menu-return.ts`) est d'une autre nature : elle
**déclenche** — elle place le curseur sur le menu qu'on vient d'écrire et fait paraître son constat.
Une provenance qui déclenche doit donc **quitter l'adresse dès qu'elle a servi**
(`navigate(MENU_SANS_PROVENANCE, { replace: true })`), sinon elle rejoue.

Le défaut, reproduit en navigateur : enregistrer, reculer d'une semaine, aller sur Recettes, puis
**revenir en arrière**. L'entrée d'historique portait encore `?enregistre` ; le retour rejouait le
positionnement et ressuscitait « Menu enregistré » alors que rien n'avait été enregistré — un faux
signal de succès, et la semaine consultée écrasée. Un signet et un rechargement ouvraient la même
porte.

Deux verrous, à deux étages, parce que le container n'est pas muté
([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)) :

- l'adresse est **nettoyée** dès la première arrivée qui l'a consommée, donc l'entrée d'historique
  vers laquelle on revient ne déclenche plus rien ;
- le slice **renonce** à la cible d'un enregistrement dès que l'utilisateur déplace son curseur
  (`previousMenuSelected` / `nextMenuSelected` remettent `focusOn` à `null`) : même si l'adresse
  revenait, elle ne retrouverait rien à repositionner.

**Ce qui n'est PAS consommé, et pourquoi.** La cible n'est pas effacée par l'arrivée qui s'en sert :
le double passage d'effet de `StrictMode` est **indiscernable** d'une seconde arrivée, et une
consommation à l'arrivée effacerait le constat aussitôt posé. C'est l'adresse, et elle seule, qui
distingue « la même arrivée rejouée » de « une nouvelle arrivée ».

### Mesure — `<StrictMode>` ne double que s'il est la RACINE rendue

Un test qui l'enveloppe dans un composant (`function Harnais() { return <StrictMode>…</StrictMode> }`)
**ne double rien** : les effets n'y passent qu'une fois. Mesuré sur React 19 + RTL, séquence de
sondes `['nu', 'provider', 'router', 'route', 'nu', …]` quand `<StrictMode>` est l'élément passé à
`render()`, et `['dans-un-composant']` — un seul passage — quand un composant le retourne.

Conséquence pratique : un harnais de test qui prétend éprouver `StrictMode` doit passer
`render(<StrictMode>…</StrictMode>)`. La première version du harnais de `MenuCreateContainer` ne le
faisait pas ; retirer la réaffectation `monte.current = true` que décrit l'[ADR 0021](0021-naviguer-sur-l-issue-pas-sur-le-statut.md)
ne cassait alors **aucun** test. Une fois `<StrictMode>` remonté à la racine du rendu, le sabotage
est rouge — le garde de démontage et sa réaffectation sont tous deux tenus.

### Mesure — Vitest 4 AVALE les `console.log` des composants

Aucune sortie, ni en succès ni en échec, pour un `console.log` ou un `console.error` posé dans un
composant rendu par RTL. Trois sondes muettes ont laissé croire qu'un `.then` ne s'exécutait pas,
alors qu'il s'exécutait. Ce qui a tranché : **inverser le garde** (`!monte.current`) et lire la
réponse dans la couleur des tests — le seul canal que le runner ne filtre pas.

Règle qui en découle, et qui n'est que celle du dépôt appliquée à soi-même : une sonde est un
**instrument de mesure**, donc elle se confronte à un cas dont on connaît la réponse **avant** d'en
tirer une conclusion. Une sonde silencieuse ne dit pas « le code n'est pas passé » ; elle ne dit
rien.

## La mesure

Aucune mesure chiffrée : décision de conception, prise contre l'alternative du retour unique. Un
point est mesuré, lui : le repli sur une provenance héritée d'`Object.prototype`, constaté rouge
puis fermé par le test « sur une provenance qui porte le nom d'une propriété d'Object, le retour
retombe sur les recettes ».

## Conséquences

- Un écran qui produit des liens vers les fiches doit **déclarer** sa provenance ; en ajouter un
  quatrième se fait dans un seul module, avec son test de retour et son test de repli.
- Le retour depuis une fiche ouverte d'un brouillon mène à `/menu/nouveau`, où le brouillon est
  toujours là — il survit dans le store tant qu'il n'est ni enregistré ni régénéré. Après un
  **rechargement**, le store repart neuf : la même adresse rend le formulaire vierge, ce qui est le
  comportement voulu et ce que vérifie le scénario « la provenance survit à un rechargement de la
  fiche ».
- Les scénarios Playwright localisent le retour par son **texte** (« ← Menu ») et son **URL**
  attendue : c'est l'URL, et elle seule, qui distingue les deux provenances.
