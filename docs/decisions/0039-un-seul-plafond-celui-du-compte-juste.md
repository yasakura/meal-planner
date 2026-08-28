# ADR 0039 — Un seul plafond de quantité, celui du compte juste

- **Statut** : en vigueur
- **Date** : 2026-08-27 (branche `iter-63-prorata`)
- **Portée** : `src/domain/entities/ingredient.ts`, `src/domain/use-cases/effective-ingredients.ts`,
  `src/domain/lib/arrondi.ts`, `src/ui/features/recipe/ingredient-rows.ts`
- **Issues** : [#152](https://github.com/yasakura/meal-planner/issues/152), et
  [#161](https://github.com/yasakura/meal-planner/issues/161), que cette décision rétrécit sans la
  fermer

## Contexte

`src/domain/use-cases/effective-ingredients.ts#effectiveIngredients` existait depuis des mois
**sans aucun appelant**. Le lot `iter-63-prorata` lui en a donné un : la fiche recette ouverte
depuis un créneau de menu, qui la lit pour l'effectif du créneau
([ADR 0022](0022-la-provenance-vit-dans-l-url.md)). Des quantités qui dormaient sans conséquence se
sont mises à traverser un calcul, et le calcul les a rendues fausses.

Le plafond de l'entité était alors `Number.MAX_SAFE_INTEGER`.

## La mesure

Sondes jetables, chacune confrontée d'abord à deux cas dont la réponse est connue d'avance —
`1 kg` pour 4 → 1 pers. `= 250 g`, `500 g` pour 4 → 5 pers. `= 625 g`.

| Entrée                                     | Ce que l'écran montrait                              | Le compte juste            |
| ------------------------------------------ | ---------------------------------------------------- | -------------------------- |
| `1 kg` pour 4 → 1 pers.                    | `250 g`                                              | `250 g` — témoin           |
| `500 g` pour 4 → 5 pers.                   | `625 g`                                              | `625 g` — témoin           |
| `999 999 999 999 g` pour 4 → 8 pers.       | `2 000 000 000 000 g`                                | `1 999 999 999 998 g`      |
| `9 007 199 254 740 991 g` pour 4 → 5 pers. | **rien** : `createIngredient` jette pendant le rendu | —                          |
| `9 007 199 254 740,99 kg` pour 4 → 5 pers. | `11 258 999 068 400 kg`                              | `11 258 999 068 426,24 kg` |

Deux grammes de trop, **en silence**, et `src/domain/entities/ingredient.ts#createIngredient`
acceptait ce résultat sans broncher. Le mensonge commence à **10¹² unités de base**, là où
`toPrecision(12)` cesse de retirer du bruit et se met à rogner des chiffres.

Les deux dernières lignes sont la même magnitude, écrite dans deux unités : **les grammes tuaient
l'écran, les kilos mentaient**. La sortie en grammes dépassait `Number.MAX_SAFE_INTEGER` et se
faisait refuser par l'entité au milieu d'un rendu ; la sortie en kilos, mille fois plus petite,
passait sous le plafond et s'affichait.

_Re-vérification à la rédaction_ : l'arithmétique des cinq lignes a été rejouée et **reproduit les
mêmes chiffres**, témoins compris. Les **conséquences à l'écran** — page vide, affichage silencieux
— n'ont pas pu l'être : le plafond décidé ici refuse désormais ces quantités à la saisie, donc le
chemin qui menait au rendu n'existe plus.

## Décision

**Un seul plafond, celui du compte juste**, exprimé sur le **besoin en unité de base de la quantité
écrite** : `src/domain/entities/ingredient.ts#LIMITE_DU_COMPTE_JUSTE`, soit `10¹²` en g / ml /
pièce, donc `10⁹` en kg / l.

Trois mesures lui donnent sa forme, et chacune écarte une forme plus simple.

1. **Un nombre plat ne marche pas.** À `10¹²`, `999 999 999 999 kg` s'enregistre et ne se calcule
   jamais — son besoin en base vaut `999 999 999 999 000`. À `10⁹`, on interdit `2 000 000 000 g`,
   qui se calcule très bien : pour 4 → 3 pers., `1 500 000 000 g`. D'où une borne sur le **besoin en
   unité de base** (`src/domain/entities/ingredient.ts#enUniteDeBase`,
   `src/domain/entities/ingredient.ts#BASES_PAR_GRANDE_UNITE`), pas sur le nombre écrit.

2. **La borne de l'entité est inclusive.** Mesuré : `1 999 999 999 999 g` pour 4 → 2 pers. produit
   `1 000 000 000 000` **pile**. Une borne stricte ferait donc que le calcul **rejette son propre
   résultat** : on ne pourrait pas réenregistrer ce que le prorata vient de produire.

3. **Le refus du use-case, lui, reste strict.** Au-delà de `10¹²`, douze chiffres significatifs ne
   distinguent plus `1 000 000 000 000,5` de `1 000 000 000 000` : l'arrondi au supérieur rendrait
   `10¹²` au lieu de `10¹² + 1`, soit un **sous-comptage silencieux**, exactement l'inverse de ce que
   « jamais moins que nécessaire » promet. `src/domain/use-cases/effective-ingredients.ts#besoinEnUniteDeBase`
   compare donc `>=` là où `src/domain/entities/ingredient.ts#createIngredient` compare `>`.

**Les deux comparaisons diffèrent à dessein.** C'est le genre d'asymétrie qu'un lecteur futur voudra
« harmoniser » ; l'harmoniser dans un sens rend un résultat inenregistrable, dans l'autre un compte
faux.

## Alternatives écartées

**`Number.MAX_SAFE_INTEGER`**, qui était le plafond retenu quelques heures plus tôt. C'est
l'**état de l'art pour un champ numérique de formulaire** : Element Plus borne son `input-number` à
`[Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]` par défaut
([doc `input-number`](https://element-plus.org/en-US/component/input-number.html)), et MDN pose
2⁵³ − 1 comme la limite au-delà de laquelle deux entiers cessent d'être distinguables
([`Number.MAX_SAFE_INTEGER`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)).
Écarté parce qu'il laisse **quatre ordres de grandeur** entre ce qui s'enregistre (`~10¹⁶`) et ce qui
se calcule juste (`10¹²`) — et c'est dans cet intervalle que vivent les trois dernières lignes du
tableau.

**Une borne « de cuisine »**, un plafond choisi pour avoir un sens physique — du genre `100 000`.
Proposée par raisonnement, **écartée faute de source** :

- **Mealie**, le gestionnaire de recettes auto-hébergé le plus répandu, stocke la quantité en
  `mapped_column(Float)` **sans aucune borne**
  ([`mealie/db/models/recipe/ingredient.py`](https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/db/models/recipe/ingredient.py)) ;
- **schema.org** ne pose **aucune contrainte de valeur** sur `recipeIngredient`, dont le type
  attendu est `Text`, `ItemList` ou `PropertyValue`
  ([`schema.org/recipeIngredient`](https://schema.org/recipeIngredient)).

Personne ne borne une quantité d'ingrédient par sa magnitude physique. Cette ligne compte : c'est le
geste « aller voir dehors » qui a démoli une recommandation formulée dix minutes plus tôt.

## Conséquences

- **Le plafond et l'arithmétique des unités ont descendu du use-case vers l'entité**
  (`src/domain/entities/ingredient.ts`), seule direction possible — une entité ne peut pas importer
  un use-case. `1000` et `10¹²` n'existent plus qu'en un seul endroit, et le formulaire lit le même
  verdict que le domaine par `src/ui/features/recipe/ingredient-rows.ts#isAcceptableQuantity`.

- **Un prix de mutation, mesuré, à assumer.** Ces constantes de module créent des mutants `static`,
  rejoués contre les 718 tests des fichiers qui importent l'entité. Le run isolé passe de ~1 min à
  ~3 min 40 et sort **10 timeouts** sous `timeoutMS: 10 000`. Rejoué à `timeoutMS: 120 000`, le même
  fichier rend **100 %, 50 tués, 0 timeout, 0 survivant** : les timeouts sont **structurels**, ils
  ne masquent aucun survivant. Ce coût pèsera sur chaque run futur touchant l'entité. _Chiffres
  mesurés par le lot ; non re-vérifiés à la rédaction, aucune mesure ne se prenant sur une machine
  occupée._

- **`src/domain/entities/ingredient.ts#CHIFFRES_SIGNIFICATIFS_FIABLES` est adossée à un test**, et
  c'est structurel : **Stryker ne mute pas les littéraux numériques** — sa liste de mutateurs couvre
  les chaînes, les booléens, les opérateurs, jamais les nombres
  ([mutateurs supportés](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/)).
  Rien d'autre ne garde le `12`. Le test qui le tient nomme la frontière qu'il garde : « refuse le
  premier besoin que douze chiffres ne portent plus ».

- **[#161](https://github.com/yasakura/meal-planner/issues/161) rétrécit sans se fermer, et son
  argument d'atteignabilité est périmé.** L'issue disait la bande fautive saisissable « parce que
  l'entité admet des quantités jusqu'à `Number.MAX_SAFE_INTEGER` » ; ce n'est plus vrai, son cas
  mesuré (`1 234 567 890 122 g`) est désormais refusé à la saisie. L'écart, lui, survit sous le
  plafond : mesuré à la rédaction contre le code de cette branche, `999 999 999 999 g` pour 4 → 3
  pers. rend `749 999 999 999 g` là où il en faut `750 000 000 000` — **un gramme de moins que
  nécessaire**. `src/domain/lib/arrondi.ts#sansBruitFlottant` tronque encore une
  valeur avant que `Math.ceil` ne s'y applique ; le plafond fait passer l'écart de −4 g à −1 g, il ne
  le supprime pas.
