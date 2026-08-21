# ADR 0009 — Discriminer les réponses de thunks par `requestId`

- **Statut** : en vigueur
- **Date** : 2026-08-13 (`8e79f41`, catalogue et fiche) puis 2026-08-18 (`b70c5e6`, menu)
- **Portée** : tous les slices de `src/ui/features/`

## Contexte

**Un thunk RTK n'est pas annulé par le démontage de son container.** Rien dans React ne l'annule,
rien ne le signale : la requête reste en vol et sa réponse arrivera, quel que soit l'écran affiché à
ce moment-là. Sur un réseau lent, deux lectures ou deux écritures se règlent alors **dans le
désordre**, et la plus ancienne écrase la plus récente.

Les défauts observés, tous silencieux :

- quitter `/catalogue` pendant un chargement lent puis y revenir : la réponse tardive de la première
  lecture écrasait un catalogue à jour — et, depuis l'ajout de `unavailable`, l'écrasait par un
  constat hors-ligne **sans bouton pour en sortir** ;
- ouvrir une recette sur un réseau qui rame, revenir, ouvrir une autre : le rejet tardif de la
  première affichait « Aucune connexion » par-dessus une fiche qui venait de se charger ; un succès
  tardif affichait l'**ancienne** recette sous l'URL de la nouvelle ;
- fermer la sheet du foyer pendant un chargement puis la rouvrir : le rejet du premier chargement
  effaçait le foyer fraîchement affiché ;
- côté menu, une relecture périmée du catalogue faisait revenir des titres périmés — et, en
  écriture, le verdict d'un enregistrement dépassé faisait afficher « Menu enregistré » sur un menu
  que personne n'avait fini d'enregistrer.

## Décision

Chaque cycle de vie mémorise le **`requestId` de la dernière opération lancée** (`.pending`), et
chaque verdict (`.fulfilled` / `.rejected`) est **jeté avant tout examen** s'il ne correspond pas.

Trois points contre-intuitifs, chacun payé par un défaut :

1. **Le champ n'est pas remis à `null` au règlement.** Il signifie « dernière opération lancée »,
   pas « opération en vol ». Le garde compare par `!==` : un champ à `null` ne laisserait passer
   **aucune** réponse, il les rejetterait toutes. C'est de le garder renseigné qui rend la
   comparaison discriminante. Corollaire : `latest…RequestId !== null` n'est **pas** un prédicat
   « une écriture est en vol » — le verrou d'un bouton se lit sur le **statut**.
2. **Une mémoire par cycle de vie**, jamais une pour tout le slice. Une mémoire unique ferait qu'un
   rechargement invaliderait l'ajout en vol, et réciproquement. Mais **une seule** mémoire pour deux
   producteurs du **même** champ : côté menu, génération et relecture écrivent toutes deux
   `recipes`, donc une génération doit invalider une relecture en vol.
3. **Le `requestId` est strictement plus fin que l'identifiant demandé.** Chaque dispatch en reçoit
   un unique, y compris deux consultations successives de la même recette : un test sur l'id seul
   laisserait passer la réponse tardive du premier `r-1` dans l'enchaînement `r-1 → r-2 → r-1`.

**Une exception, délibérée** : `removeConvive.fulfilled` applique le retrait **hors garde**. Un
retrait est **monotone** — une fois effacé du serveur, le convive ne redevient jamais présent.
Ignorer un succès périmé laisserait dans la liste quelqu'un qui n'existe plus. Le **constat**, lui,
reste gardé : un retrait périmé n'a pas à refermer la confirmation ouverte pour un autre convive. Un
**renommage** n'est pas monotone, et reste donc gardé de bout en bout.

## La mesure

Ces séquences ne sont pas observables dans un test qui laisse les promesses se régler dans leur
ordre de lancement. Elles sont prouvées par `src/ui/test-utils/deferred.ts`, qui garde la main sur
le règlement et permet de résoudre **dans le désordre** ; sans lui, un test passerait vert sans
qu'aucun garde n'existe.

## Conséquences

- Le `condition` d'un thunk filtre le **départ** d'une opération, pas son **arrivée** : les deux
  filtres sont nécessaires et ne se remplacent pas.
- La remise au repos d'un cycle **désavoue** ce qui est en vol : après elle, aucun verdict ne
  correspond plus à aucun identifiant, donc tout ce qui revient est jeté. C'est l'usage voulu du
  nullage dans `restSaveLifecycle`.
- Un garde retiré ne fait **rougir aucun test existant** s'il n'a pas son test dédié : voir
  [ADR 0010](0010-le-non-garde-de-generate-menu-fulfilled.md) pour le cas où le garde n'existe même
  pas, et tient à une ligne située ailleurs.
