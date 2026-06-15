# Design — Éditeur de tableaux CCTP (Phase B)

**Date :** 2026-06-15
**Composant :** PCF `Nexans/PageFicheChantier` (namespace manifest `nex`)
**Statut :** Validé (à implémenter)

## Contexte

Le PCF reçoit l'extraction CCTP d'AI Builder via la propriété d'entrée
`Input_CCTPJson` (`{ labels, tables }`). La **Phase A** (livrée) fusionne les 13
`labels` scalaires dans le formulaire (règle d'or : SharePoint prime ; cf.
`merge.ts` / `confidence.ts`). La **Phase B** (ce document) exploite le bloc
`tables` : un éditeur de tableaux à onglets, par section, avec push JSON vers de
nouvelles colonnes SharePoint.

Le PCF ne fait **aucun appel HTTP**. Les outputs et le `handleSave`/Patch
existants (`latestChange`, `schemaChange`, `navigationRequest`,
`selectedProjectUniqID`) ne sont **pas modifiés**.

## Objectif

Permettre à l'utilisateur de **visualiser** ce que l'IA a extrait dans les
tableaux du CCTP, puis de **corriger / compléter / ajouter des lignes**, et de
**pousser** chaque tableau au format JSON dans une colonne SharePoint dédiée
(multiline text simulant du JSON).

## Décisions validées

- **Point d'entrée** : nouveau `AppMode 'tables'` plein écran + 4e carte sur le
  landing (même pattern que l'éditeur de Schéma).
- **Sortie** : **1 colonne JSON par section** (4 nouvelles propriétés `output`).
- **Toggle « IA Builder / Saisie main »** par section, **non persisté** :
  - **IA Builder** = lecture seule de l'extraction IA + pastilles de confiance
    (🟢 > 0.8, 🟠 > 0.5, 🔴 sinon).
  - **Saisie main** = grille éditable, amorcée en copiant les lignes IA (ou la
    dernière valeur SP déjà patchée si présente). Édition cellule par cellule,
    ajout/suppression de lignes.
  - C'est la grille « Saisie main » (curée) qui est sérialisée à l'enregistrement.
- **Design** : on **réutilise le design général Nexans existant** (thème
  `theme/nexansTheme.ts`, rouge `#A30026`/`#C90016`, classes Tailwind et patterns
  visuels de `SchemaEditor.tsx` et du formulaire). La maquette neutre validée ne
  servait qu'à figer la structure.
- **Section « Caractéristiques Générales »** (12 colonnes, confiance 0.014) :
  **différée**. La section 4 ne traite en MVP que **Coordonateur SPS** (2 colonnes).

## Sections (MVP)

| Onglet | Table(s) IA source (`displayName`) | Colonnes | Colonne SP (output) |
|---|---|---|---|
| Interlocuteurs externes | `Interlocuteurs Externes` | Nom · Mail · N° · Fonction | `cctpInterlocuteursExternes` |
| Interlocuteurs client | `Interlocuteurs Client : Centre D&I et GMR` | Nom · Mail · N° · Fonction | `cctpInterlocuteursClient` |
| Rédaction & indice | `Rédaction - Evolution` + `Indice` | (Rédacteur · Vérificateur · Approbateur · Date · Indice) + (Date · Indice · Évolution) | `cctpRedactionIndice` |
| Caractéristiques & SPS | `Coordonateur SPS / Prestataire Sécurité` | Libellé · Contact | `cctpCaracteristiquesSps` |

L'appariement table IA ↔ section se fait sur `normalizeFieldName(displayName)`
(les clés brutes des tables et des colonnes portent des suffixes GUID, neutralisés
par le normaliseur existant). Le mapping des colonnes utilise le tableau
`columns[].name` fourni par AI Builder.

## Modèle de données

```ts
// tables.ts
export interface CctpTable {
  columns: string[];                 // libellés de colonnes (ordre d'affichage)
  rows: Array<Record<string, string>>; // 1 objet par ligne, clé = libellé colonne
}

// Section « Rédaction & indice » = 2 sous-tableaux groupés :
export interface RedactionIndice {
  redaction: CctpTable;
  indice: CctpTable;
}
```

- Sérialisation par section : `JSON.stringify(CctpTable)` (ou
  `JSON.stringify(RedactionIndice)` pour la section groupée).
- Lecture seule IA : `tables.ts` fournit aussi, par cellule/ligne, le
  `confidence` brut pour piloter les pastilles (réutilise les seuils de
  `confidence.ts`).

## Définition des sections

Une table de configuration unique (source de vérité) décrit chaque section :

```ts
interface SectionDef {
  id: string;            // 'externes' | 'client' | 'redaction' | 'sps'
  label: string;         // libellé d'onglet (Nexans)
  aiTableNames: string[];// displayName(s) AI Builder à apparier
  columns: string[];     // colonnes éditables (3-4)
  outputKey: OutputName; // propriété output associée
}
```

👉 Ajouter une section ultérieurement (ex. Caractéristiques) = ajouter une ligne.

## Manifest & outputs

4 nouvelles propriétés `output` (`SingleLine.TextArea`, `usage="output"`,
`required="false"`) : `cctpInterlocuteursExternes`, `cctpInterlocuteursClient`,
`cctpRedactionIndice`, `cctpCaracteristiquesSps`. Régénérer les types via
`npm run refreshTypes`.

`index.ts` : pour chaque section, un champ privé `_cctp<Section> = ""`, un
callback `onTablesChange(outputKey, json)` qui set le champ + `notifyOutputChanged()`,
et l'ajout dans `getOutputs()`. **Les outputs/callbacks existants restent inchangés.**

## Flux de données

1. Ouverture (`AppMode 'tables'`) : `parseCctpTables(cctpJson)` → données IA par
   section (lecture seule + confiance).
2. Mode **IA Builder** : affichage lecture seule + pastilles.
3. Mode **Saisie main** : grille éditable. **Amorçage MVP = copie des lignes IA**
   de la section (ou 1 ligne blanche si l'IA n'a rien extrait). Édition / ajout /
   suppression.
4. **Enregistrer** : pour chaque section modifiée, sérialise → `onTablesChange`
   → output dédié → Power Apps Patch la colonne SP correspondante.

Note (hors scope MVP) : amorcer « Saisie main » depuis la **dernière valeur SP**
nécessiterait que Power Apps repasse ces colonnes en entrée (4 nouvelles props
`input`). Non retenu en MVP — à rouvrir si une relecture SP est souhaitée.

## Composants & isolation

- `tables.ts` — pur parsing/sérialisation, testable sans React. Entrées : `cctpJson`.
  Sorties : `Record<sectionId, CctpTable | RedactionIndice>` + métadonnées de
  confiance. Dépend de `confidence.ts` (normalisation, seuils).
- `components/TablesEditor.tsx` — UI plein écran (onglets, toggle, grilles), style
  Nexans. Props : `cctpJson`, valeurs SP initiales optionnelles, `onSave(sectionId, json)`,
  `onBack()`. État local de la grille éditable ; ne mute pas les props.
- `App.tsx` — branche le mode + la carte landing + relaie `onTablesChange` vers
  `index.ts`. N'altère pas la logique de fusion Phase A ni le Patch existant.

## Gestion des erreurs

- `cctpJson` vide/invalide → sections vides (grilles vides), pas de crash
  (parsing tolérant, comme `buildConfidenceMap`).
- Table IA absente / `entries` vide → grille vide avec 1 ligne blanche en mode
  Saisie main.
- Colonnes IA inattendues → ignorées (on ne garde que les `columns` définies).

## Tests

- Unitaires `tables.ts` : parsing GUID/colonnes, appariement par `displayName`,
  tables vides, round-trip `parse → edit → serialize`, calcul des pastilles.
- Build + lint PCF (`npm run build`) verts.
- Vérif manuelle : ouverture mode tables, toggle IA↔Main, édition/ajout/suppression,
  enregistrement → outputs non vides, outputs existants intacts.

## Hors scope (itérations futures)

- Table « Caractéristiques Générales » (12 colonnes).
- Persistance du mode toggle.
- Relecture des colonnes SP en entrée pour réamorçage (sauf si confirmé).
