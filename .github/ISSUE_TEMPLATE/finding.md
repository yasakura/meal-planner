---
name: Finding
about: Un défaut relevé pendant un cycle, reprenable sans le contexte de la session
title: ''
labels: ''
assignees: ''
---

<!--
LIGNE DE PROVENANCE — obligatoire, en premier, avant tout titre.
Sans elle, l'issue est inexploitable pour mesurer ce que les garde-fous attrapent :
58 issues sur 87 ne disaient pas qui les avait trouvées.

Provenance — recopier UNE valeur, telle quelle :
  revue indépendante · vérif Chrome · agent mutation · Playwright · lint / gardes statiques
  build · cliquets de couverture · agent TDD · utilisateur · audit hors cycle

Classement — les deux axes, toujours (règle d'arrêt du CLAUDE.md) :
  introduit | pré-existant     — le défaut est-il déjà sur main avant la branche ?
  bloquant  | non bloquant     — perte de donnée, faux signal de succès, écran qui se
                                 contredit, impasse sans porte de sortie. Pas « ce serait mieux autrement ».
-->

Relevé par **PROVENANCE** sur `branche-ou-lot`, **vérifié**. **Pré-existant**, **non bloquant** : MOTIF.

## Le scénario

<!-- Ce qu'on fait, ce qu'on voit, ce qu'on devrait voir. Une trace ou un bloc de code
     plutôt qu'une description : l'issue doit se rejouer sans son auteur. -->

```

```

## Où

<!-- `fichier:ligne` comme l'exige le CLAUDE.md. Le symbole en plus quand il y en a un :
     la ligne dérive au premier ajout en amont, le symbole survit (ADR 0035). -->

- `chemin/du/fichier.ts:42` — `nomDuSymbole`

## Ce que ça casse

<!-- La conséquence pour l'utilisateur, ou l'invariant rompu. Si rien ne casse aujourd'hui,
     dire à QUELLE CONDITION ça cassera — c'est ce qui permet de re-classer plus tard.
     Un classement se périme (motif #138 : non bloquant le matin, seul bloquant du jour à 16 h). -->

## Ce qu'aucun filet n'a vu

<!-- Quel garde-fou aurait dû l'attraper et ne l'a pas, et pourquoi.
     « Aucun ne pouvait » est une réponse valable. « Je ne sais pas » aussi.
     C'est cette ligne qui rend l'inventaire des garde-fous rejouable l'an prochain. -->
