# Éditeur de tableaux CCTP (Phase B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un éditeur plein écran qui affiche les tableaux extraits du CCTP par AI Builder (lecture seule + confiance), permet de les corriger/compléter (saisie main), et pousse chaque section en JSON vers une colonne SharePoint dédiée — sans toucher au formulaire/Patch existants.

**Architecture:** Un module pur `tables.ts` parse le bloc `tables` du JSON IA en sections normalisées (apparie tables et colonnes par `displayName` via `normalizeFieldName`). Un composant `TablesEditor.tsx` (mode `tables`, 4e carte du landing, style Nexans) édite ces grilles. 4 nouvelles propriétés `output` du manifest transportent le JSON, relayées par `App.tsx` → `index.ts`.

**Tech Stack:** PowerApps PCF (pcf-scripts/webpack), React 17 + TypeScript, Tailwind, thème `theme/nexansTheme.ts`. Tests unitaires via **vitest** (module pur uniquement).

**Réfs spec :** `docs/superpowers/specs/2026-06-15-cctp-tables-editor-design.md`. Phase A (déjà livrée) : `merge.ts`, `confidence.ts`.

**Réutilisables (déjà présents dans `PageFicheChantier/confidence.ts`) :**
- `normalizeFieldName(name: string): string` — minuscules, sans accents, sans suffixe GUID.
- `confidenceLevel(score: number | undefined, isEmpty: boolean): ConfidenceLevel` — `'green' | 'orange' | 'red' | 'empty'`.
- `CONFIDENCE_COLORS: Record<ConfidenceLevel, { border; ring; badgeBg; badgeText }>`.

**Colonnes réelles (vérifiées sur l'échantillon AI Builder) :**
- Interlocuteurs Externes → `Nom`, `Mail`, `N° Téléphone`, `Fonction`
- Interlocuteurs Client (`Interlocuteurs Client : Centre D&I et GMR`) → `Nom Prénom`, `Mail`, `N° Téléphone`, `Fonction`
- `Rédaction - Evolution` → `Rédacteur`, `Vérificateur`, `Approbateur`, `Date`, `Indice`
- `Indice` → `Date`, `Indice`, `Evolution`
- `Coordonateur SPS / Prestataire Sécurité` → `Libellé`, `Contact`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `tests/tables.test.ts` (create) | Tests unitaires vitest du parsing/sérialisation. Hors `PageFicheChantier/` pour ne pas passer dans le lint pcf-scripts. |
| `vitest.config.ts` (create) | Config vitest (env node, include `tests/`). |
| `package.json` (modify) | Scripts `test`/`test:watch` + devDep `vitest`. |
| `PageFicheChantier/tables.ts` (create) | Module pur : `SECTION_DEFS`, `parseCctpTables`, `serializeSection`, types. Aucune dépendance UI. |
| `PageFicheChantier/ControlManifest.Input.xml` (modify) | 4 propriétés `output` multiline. |
| `PageFicheChantier/index.ts` (modify) | Stocke/émet les 4 outputs via `onTablesChange`. |
| `PageFicheChantier/types.ts` (modify) | `AppMode` += `'tables'`. |
| `PageFicheChantier/App.tsx` (modify) | Prop `onTablesChange`, 4e carte landing, rendu du mode `tables`. |
| `PageFicheChantier/components/TablesEditor.tsx` (create) | UI plein écran : onglets, toggle IA/main, grilles éditables. |

---

## Task 1: Outil de test (vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Ajouter vitest en devDependency**

Run:
```bash
npm install -D vitest@^2
```
Expected: `package.json` devDependencies contient `vitest`, install OK.

- [ ] **Step 2: Ajouter les scripts de test à `package.json`**

Dans la section `"scripts"`, ajouter ces deux lignes (garder les scripts existants tels quels) :
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Créer `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Créer un test smoke `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest tourne', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test`
Expected: PASS (1 test passé).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/smoke.test.ts
git commit -m "test: configure vitest pour le module tables"
```

---

## Task 2: `tables.ts` — modèle + parsing (TDD)

**Files:**
- Create: `PageFicheChantier/tables.ts`
- Create: `tests/tables.test.ts`

- [ ] **Step 1: Écrire le test de parsing (qui échoue)**

Créer `tests/tables.test.ts` :
```ts
import { describe, it, expect } from 'vitest';
import { parseCctpTables, SECTION_DEFS } from '../PageFicheChantier/tables';

const SAMPLE = JSON.stringify({
  tables: {
    T1: {
      displayName: 'Interlocuteurs Externes',
      columns: [{ name: 'Nom' }, { name: 'Mail' }, { name: 'N° Téléphone' }, { name: 'Fonction' }],
      entries: [
        {
          a: { displayName: 'Nom', value: 'LEMAITRE Julien', confidence: 0.6 },
          b: { displayName: 'Mail', value: 'j@omexom.com', confidence: 0.81 },
          c: { displayName: 'N° Téléphone', value: '06 18', confidence: 0.6 },
          d: { displayName: 'Fonction', value: 'BE', confidence: 0.9 },
        },
        {
          a: { displayName: 'Nom', value: '' },
          d: { displayName: 'Fonction', value: 'DEKRA', confidence: 0.74 },
        },
      ],
    },
  },
});

describe('parseCctpTables', () => {
  it('mappe les cellules par displayName et calcule les niveaux', () => {
    const res = parseCctpTables(SAMPLE);
    const grid = res.externes.grids[0];
    expect(grid.columns).toEqual(['Nom', 'Mail', 'N° Téléphone', 'Fonction']);
    expect(grid.rows).toHaveLength(2);
    expect(grid.rows[0]).toEqual({ Nom: 'LEMAITRE Julien', Mail: 'j@omexom.com', 'N° Téléphone': '06 18', Fonction: 'BE' });
    expect(grid.levels[0].Mail).toBe('green');   // 0.81 > 0.8
    expect(grid.levels[0].Nom).toBe('orange');   // 0.6
    expect(grid.rows[1].Fonction).toBe('DEKRA');
    expect(grid.levels[1].Nom).toBe('empty');    // cellule vide
  });

  it('retourne des sections vides pour un JSON vide/invalide', () => {
    for (const input of ['', '   ', 'not json', undefined]) {
      const res = parseCctpTables(input as string);
      expect(Object.keys(res)).toHaveLength(SECTION_DEFS.length);
      expect(res.externes.grids[0].rows).toHaveLength(0);
    }
  });

  it('expose les 4 sections (rédaction = 2 grilles)', () => {
    const res = parseCctpTables('');
    expect(res.redaction.grids).toHaveLength(2);
    expect(res.sps.grids[0].columns).toEqual(['Libellé', 'Contact']);
  });
});
```

- [ ] **Step 2: Lancer le test → échec attendu**

Run: `npm test`
Expected: FAIL (`Cannot find module '../PageFicheChantier/tables'`).

- [ ] **Step 3: Créer `PageFicheChantier/tables.ts`**

```ts
import { ConfidenceLevel, confidenceLevel, normalizeFieldName } from './confidence';

export type SectionId = 'externes' | 'client' | 'redaction' | 'sps';

export interface GridDef {
  key: string;
  title?: string;
  aiTableNames: string[];
  columns: string[];
}

export interface SectionDef {
  id: SectionId;
  label: string;
  outputKey: string;
  grids: GridDef[];
}

export const SECTION_DEFS: SectionDef[] = [
  {
    id: 'externes',
    label: 'Interlocuteurs externes',
    outputKey: 'cctpInterlocuteursExternes',
    grids: [{ key: 'externes', aiTableNames: ['Interlocuteurs Externes'], columns: ['Nom', 'Mail', 'N° Téléphone', 'Fonction'] }],
  },
  {
    id: 'client',
    label: 'Interlocuteurs client',
    outputKey: 'cctpInterlocuteursClient',
    grids: [{ key: 'client', aiTableNames: ['Interlocuteurs Client : Centre D&I et GMR', 'Interlocuteurs Client'], columns: ['Nom Prénom', 'Mail', 'N° Téléphone', 'Fonction'] }],
  },
  {
    id: 'redaction',
    label: 'Rédaction & indice',
    outputKey: 'cctpRedactionIndice',
    grids: [
      { key: 'redaction', title: 'Rédaction / Évolution', aiTableNames: ['Rédaction - Evolution'], columns: ['Rédacteur', 'Vérificateur', 'Approbateur', 'Date', 'Indice'] },
      { key: 'indice', title: 'Indices', aiTableNames: ['Indice'], columns: ['Date', 'Indice', 'Evolution'] },
    ],
  },
  {
    id: 'sps',
    label: 'Caractéristiques & SPS',
    outputKey: 'cctpCaracteristiquesSps',
    grids: [{ key: 'sps', aiTableNames: ['Coordonateur SPS / Prestataire Sécurité'], columns: ['Libellé', 'Contact'] }],
  },
];

export interface GridRow { [column: string]: string; }

export interface ParsedGrid {
  key: string;
  title?: string;
  columns: string[];
  rows: GridRow[];
  levels: Array<Record<string, ConfidenceLevel>>;
}

export interface ParsedSection {
  id: SectionId;
  label: string;
  outputKey: string;
  grids: ParsedGrid[];
}

interface RawCell { value?: unknown; text?: unknown; displayName?: string; confidence?: number; }
interface RawTable { displayName?: string; entries?: Array<Record<string, unknown>>; }

function cellText(cell: RawCell): string {
  const v = cell.value ?? cell.text;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function findTable(tables: Record<string, unknown>, aiTableNames: string[]): RawTable | undefined {
  const targets = aiTableNames.map(normalizeFieldName);
  for (const v of Object.values(tables)) {
    if (!v || typeof v !== 'object') continue;
    const t = v as RawTable;
    if (t.displayName && targets.includes(normalizeFieldName(t.displayName))) return t;
  }
  return undefined;
}

function parseGrid(tables: Record<string, unknown>, def: GridDef): ParsedGrid {
  const table = findTable(tables, def.aiTableNames);
  const rows: GridRow[] = [];
  const levels: Array<Record<string, ConfidenceLevel>> = [];
  const colByNorm = new Map(def.columns.map((c) => [normalizeFieldName(c), c]));

  for (const entry of table?.entries ?? []) {
    const row: GridRow = {};
    const lvl: Record<string, ConfidenceLevel> = {};
    for (const c of def.columns) { row[c] = ''; lvl[c] = 'empty'; }

    for (const raw of Object.values(entry)) {
      if (!raw || typeof raw !== 'object') continue;
      const cell = raw as RawCell;
      if (!cell.displayName) continue;
      const col = colByNorm.get(normalizeFieldName(cell.displayName));
      if (!col) continue;
      const value = cellText(cell);
      row[col] = value;
      lvl[col] = confidenceLevel(cell.confidence, value.trim() === '');
    }

    if (def.columns.some((c) => row[c].trim() !== '')) {
      rows.push(row);
      levels.push(lvl);
    }
  }
  return { key: def.key, title: def.title, columns: def.columns, rows, levels };
}

export function parseCctpTables(cctpJson: string | undefined | null): Record<SectionId, ParsedSection> {
  let tables: Record<string, unknown> = {};
  if (cctpJson && cctpJson.trim()) {
    try {
      const root = JSON.parse(cctpJson) as Record<string, unknown>;
      if (root.tables && typeof root.tables === 'object') tables = root.tables as Record<string, unknown>;
    } catch {
      tables = {};
    }
  }
  const out = {} as Record<SectionId, ParsedSection>;
  for (const def of SECTION_DEFS) {
    out[def.id] = {
      id: def.id,
      label: def.label,
      outputKey: def.outputKey,
      grids: def.grids.map((g) => parseGrid(tables, g)),
    };
  }
  return out;
}
```

- [ ] **Step 4: Lancer le test → succès attendu**

Run: `npm test`
Expected: PASS (les 3 tests `parseCctpTables`).

- [ ] **Step 5: Commit**

```bash
git add PageFicheChantier/tables.ts tests/tables.test.ts
git commit -m "feat: parsing des tableaux CCTP (tables.ts)"
```

---

## Task 3: `tables.ts` — sérialisation + helpers (TDD)

**Files:**
- Modify: `PageFicheChantier/tables.ts`
- Modify: `tests/tables.test.ts`

- [ ] **Step 1: Ajouter les tests de sérialisation (qui échouent)**

Ajouter à la fin de `tests/tables.test.ts` :
```ts
import { serializeSection, emptyRow } from '../PageFicheChantier/tables';

describe('serializeSection / emptyRow', () => {
  it('sérialise columns + rows sous { grids: [...] }', () => {
    const rows = [{ Nom: 'X', Mail: '', 'N° Téléphone': '', Fonction: 'Y' }];
    const json = serializeSection([{ key: 'externes', columns: ['Nom', 'Mail', 'N° Téléphone', 'Fonction'], rows }]);
    expect(JSON.parse(json)).toEqual({ grids: [{ key: 'externes', columns: ['Nom', 'Mail', 'N° Téléphone', 'Fonction'], rows }] });
  });

  it('emptyRow crée une ligne aux colonnes vides', () => {
    expect(emptyRow(['A', 'B'])).toEqual({ A: '', B: '' });
  });
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npm test`
Expected: FAIL (`serializeSection`/`emptyRow` introuvables).

- [ ] **Step 3: Implémenter dans `PageFicheChantier/tables.ts`**

Ajouter à la fin du fichier :
```ts
export interface SerializedGrid {
  key: string;
  columns: string[];
  rows: GridRow[];
}

export interface SerializedSection {
  grids: SerializedGrid[];
}

export function serializeSection(grids: SerializedGrid[]): string {
  return JSON.stringify({ grids } as SerializedSection);
}

export function emptyRow(columns: string[]): GridRow {
  const r: GridRow = {};
  for (const c of columns) r[c] = '';
  return r;
}
```

- [ ] **Step 4: Lancer → succès attendu**

Run: `npm test`
Expected: PASS (tous les tests, parsing + sérialisation).

- [ ] **Step 5: Commit**

```bash
git add PageFicheChantier/tables.ts tests/tables.test.ts
git commit -m "feat: sérialisation des sections CCTP (serializeSection)"
```

---

## Task 4: Manifest — 4 propriétés output + types

**Files:**
- Modify: `PageFicheChantier/ControlManifest.Input.xml`
- Auto: `PageFicheChantier/generated/ManifestTypes.d.ts` (via refreshTypes)

- [ ] **Step 1: Ajouter les 4 outputs au manifest**

Juste après la ligne `schemaChange` (`<property name="schemaChange" ... />`), ajouter :
```xml
    <property name="cctpInterlocuteursExternes" display-name-key="CCTP_Interlocuteurs_Externes" description-key="JSON tableau interlocuteurs externes (édité)" of-type="SingleLine.TextArea" usage="output" required="false" />
    <property name="cctpInterlocuteursClient" display-name-key="CCTP_Interlocuteurs_Client" description-key="JSON tableau interlocuteurs client (édité)" of-type="SingleLine.TextArea" usage="output" required="false" />
    <property name="cctpRedactionIndice" display-name-key="CCTP_Redaction_Indice" description-key="JSON tableaux rédaction et indices (édité)" of-type="SingleLine.TextArea" usage="output" required="false" />
    <property name="cctpCaracteristiquesSps" display-name-key="CCTP_Caracteristiques_SPS" description-key="JSON tableau coordonateur SPS (édité)" of-type="SingleLine.TextArea" usage="output" required="false" />
```

- [ ] **Step 2: Régénérer les types**

Run: `npm run refreshTypes`
Expected: `Succeeded`. `PageFicheChantier/generated/ManifestTypes.d.ts` → `IOutputs` contient `cctpInterlocuteursExternes?`, `cctpInterlocuteursClient?`, `cctpRedactionIndice?`, `cctpCaracteristiquesSps?`.

- [ ] **Step 3: Commit**

```bash
git add PageFicheChantier/ControlManifest.Input.xml PageFicheChantier/generated/ManifestTypes.d.ts
git commit -m "feat: 4 propriétés output pour les tableaux CCTP"
```

---

## Task 5: `index.ts` — relais des outputs

**Files:**
- Modify: `PageFicheChantier/index.ts`

- [ ] **Step 1: Ajouter le store des outputs tableaux**

Sous la ligne `private _schemaChange = "";`, ajouter :
```ts
    // Outputs tableaux CCTP — un JSON par section (clé = nom de la propriété output)
    private _cctpTables: Record<string, string> = {};
```

- [ ] **Step 2: Ajouter le callback `onTablesChange` dans les props**

Dans l'objet `props` de `updateView`, après `onNavigate: (...) => {...},`, ajouter :
```ts
            onTablesChange: (outputKey: string, json: string) => {
                this._cctpTables[outputKey] = json;
                this._notifyOutputChanged();
            },
```

- [ ] **Step 3: Émettre les 4 outputs dans `getOutputs`**

Remplacer le `return { ... }` de `getOutputs()` par :
```ts
        return {
            latestChange: this._latestChange,
            navigationRequest: this._navigationRequest,
            schemaChange: this._schemaChange,
            cctpInterlocuteursExternes: this._cctpTables.cctpInterlocuteursExternes ?? "",
            cctpInterlocuteursClient: this._cctpTables.cctpInterlocuteursClient ?? "",
            cctpRedactionIndice: this._cctpTables.cctpRedactionIndice ?? "",
            cctpCaracteristiquesSps: this._cctpTables.cctpCaracteristiquesSps ?? "",
        };
```

- [ ] **Step 4: Vérifier la compilation (échouera tant que `IAppProps.onTablesChange` n'existe pas → corrigé en Task 6)**

Run: `npm run build`
Expected: erreur TS attendue `onTablesChange` non assignable à `IAppProps`. (Sera vert après Task 6 — ne pas committer seul.) Passer à Task 6 sans commit.

---

## Task 6: `App.tsx` + `types.ts` — mode `tables` & carte landing

**Files:**
- Modify: `PageFicheChantier/types.ts`
- Modify: `PageFicheChantier/App.tsx`

- [ ] **Step 1: Étendre `AppMode`**

Dans `PageFicheChantier/types.ts`, remplacer :
```ts
export type AppMode = 'landing' | 'view' | 'edit' | 'schema';
```
par :
```ts
export type AppMode = 'landing' | 'view' | 'edit' | 'schema' | 'tables';
```

- [ ] **Step 2: Importer `TablesEditor` et l'icône**

Dans `PageFicheChantier/App.tsx`, sous `import { SchemaEditor } from './components/SchemaEditor';` ajouter :
```ts
import { TablesEditor } from './components/TablesEditor';
```
Dans l'import `lucide-react`, ajouter `Table2` à la liste des icônes importées.

- [ ] **Step 3: Ajouter `onTablesChange` à `IAppProps`**

Dans l'interface `IAppProps`, après `onNavigate?: (target: string) => void;`, ajouter :
```ts
  /** Émet le JSON d'une section de tableaux CCTP vers son output dédié. */
  onTablesChange?: (outputKey: string, json: string) => void;
```

- [ ] **Step 4: Destructurer la prop**

Dans `export default function App(props: IAppProps) {`, ajouter `onTablesChange` à la liste destructurée depuis `props`.

- [ ] **Step 5: Rendre le mode `tables` (early return après le mode `schema`)**

Juste après le bloc :
```tsx
  if (appMode === 'schema') {
    return <SchemaEditor initialLiaisons={liaisons} onBack={() => setAppMode('landing')} onSave={handleSchemaSave} />;
  }
```
ajouter :
```tsx
  if (appMode === 'tables') {
    return (
      <TablesEditor
        cctpJson={cctpJson}
        onSaveSection={(outputKey, json) => onTablesChange?.(outputKey, json)}
        onBack={() => setAppMode('landing')}
      />
    );
  }
```

- [ ] **Step 6: Élargir la grille du landing à 4 colonnes**

Dans le bloc `appMode === 'landing'`, remplacer `max-w-3xl` (conteneur des cartes) par `max-w-5xl`, et remplacer `gridTemplateColumns: 'repeat(3, 1fr)'` par `gridTemplateColumns: 'repeat(4, 1fr)'`.

- [ ] **Step 7: Ajouter la 4e carte (après la carte « Créer un Schéma »)**

Juste après le `</button>` de la carte schéma (celle avec `setAppMode('schema')`), ajouter :
```tsx
            <button
              onClick={() => setAppMode('tables')}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center border border-white/20 hover:border-white/50"
              style={{ padding: '20px 12px', minHeight: '160px' }}
            >
              <div className="bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-[#A30026] group-hover:text-white transition-colors duration-300 shadow-inner" style={{ width: '52px', height: '52px', marginBottom: '12px' }}>
                <Table2 className="text-[#A30026] group-hover:text-white" style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '14px', marginBottom: '6px' }}>Tableaux CCTP</h2>
                <p className="text-gray-500 leading-relaxed" style={{ fontSize: '11px' }}>Vérifier et corriger les tableaux extraits du CCTP.</p>
              </div>
            </button>
```

- [ ] **Step 8: Vérifier la compilation (toujours rouge tant que `TablesEditor` n'existe pas → Task 7)**

Run: `npm run build`
Expected: erreur TS `Cannot find module './components/TablesEditor'`. Passer à Task 7 sans commit.

---

## Task 7: `TablesEditor.tsx` — l'éditeur (UI Nexans)

**Files:**
- Create: `PageFicheChantier/components/TablesEditor.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
import React, { useMemo, useState } from 'react';
import { X, Save, Sparkles, PenLine, Plus, Trash2 } from 'lucide-react';
import { CONFIDENCE_COLORS, ConfidenceLevel } from '../confidence';
import {
  SECTION_DEFS,
  SectionId,
  GridRow,
  parseCctpTables,
  serializeSection,
  emptyRow,
} from '../tables';

interface TablesEditorProps {
  cctpJson?: string;
  onSaveSection: (outputKey: string, json: string) => void;
  onBack: () => void;
}

type Mode = 'ai' | 'manual';

// Modèle éditable : par section → par grille → lignes
type EditState = Record<SectionId, GridRow[][]>;

const RED = '#A30026';

export const TablesEditor: React.FC<TablesEditorProps> = ({ cctpJson, onSaveSection, onBack }) => {
  const parsed = useMemo(() => parseCctpTables(cctpJson), [cctpJson]);

  const [activeId, setActiveId] = useState<SectionId>(SECTION_DEFS[0].id);
  const [mode, setMode] = useState<Record<SectionId, Mode>>(() => {
    const m = {} as Record<SectionId, Mode>;
    for (const s of SECTION_DEFS) m[s.id] = 'ai';
    return m;
  });
  const [saved, setSaved] = useState(false);

  // Amorçage Saisie main = copie profonde des lignes IA.
  const [edited, setEdited] = useState<EditState>(() => {
    const state = {} as EditState;
    for (const s of SECTION_DEFS) {
      state[s.id] = parsed[s.id].grids.map((g) => g.rows.map((r) => ({ ...r })));
    }
    return state;
  });

  const activeSection = SECTION_DEFS.find((s) => s.id === activeId)!;
  const activeParsed = parsed[activeId];
  const activeMode = mode[activeId];

  const setCell = (gridIdx: number, rowIdx: number, col: string, value: string) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx][rowIdx][col] = value;
      return next;
    });
  };

  const addRow = (gridIdx: number) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx].push(emptyRow(activeSection.grids[gridIdx].columns));
      return next;
    });
  };

  const removeRow = (gridIdx: number, rowIdx: number) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx].splice(rowIdx, 1);
      return next;
    });
  };

  const handleSave = () => {
    for (const s of SECTION_DEFS) {
      const grids = s.grids.map((g, i) => ({ key: g.key, columns: g.columns, rows: edited[s.id][i] }));
      onSaveSection(s.outputKey, serializeSection(grids));
    }
    setSaved(true);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span style={{ width: 8, height: 22, background: RED, borderRadius: 2 }} />
          <span className="font-bold text-gray-900" style={{ fontSize: 16 }}>Tableaux CCTP</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ background: RED }}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          <button onClick={onBack} aria-label="Fermer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 px-6 py-3 bg-white border-b border-gray-200 flex-wrap">
        {SECTION_DEFS.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={active ? { background: RED, color: '#fff' } : { background: '#F5F6F8', color: '#5A6472' }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto p-6">
        {/* Toggle IA / Saisie main */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setMode((m) => ({ ...m, [activeId]: 'ai' }))}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style={activeMode === 'ai' ? { background: RED, color: '#fff' } : { background: '#fff', color: '#5A6472' }}
            >
              <Sparkles className="w-4 h-4" /> IA Builder
            </button>
            <button
              onClick={() => setMode((m) => ({ ...m, [activeId]: 'manual' }))}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style={activeMode === 'manual' ? { background: RED, color: '#fff' } : { background: '#fff', color: '#5A6472' }}
            >
              <PenLine className="w-4 h-4" /> Saisie main
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {activeMode === 'ai'
              ? 'Extrait par l’IA — lecture seule. Passez en « Saisie main » pour corriger.'
              : 'Saisie manuelle — corrigez, ajoutez ou supprimez des lignes.'}
          </span>
        </div>

        {/* Grilles de la section active */}
        {activeSection.grids.map((gridDef, gridIdx) => {
          const pGrid = activeParsed.grids[gridIdx];
          const rows = edited[activeId][gridIdx];
          return (
            <div key={gridDef.key} className="mb-8">
              {gridDef.title && (
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{gridDef.title}</h3>
              )}

              {/* En-têtes */}
              <div
                className="grid gap-2 px-1 pb-2 text-xs text-gray-500"
                style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
              >
                <span />
                {gridDef.columns.map((c) => <span key={c}>{c}</span>)}
                <span />
              </div>

              {activeMode === 'ai' ? (
                /* Lecture seule + pastilles */
                pGrid.rows.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">Aucune donnée extraite par l’IA.</p>
                ) : (
                  pGrid.rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-2 items-center mb-2"
                      style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
                    >
                      <Dot level={maxLevel(pGrid.levels[rowIdx], gridDef.columns)} />
                      {gridDef.columns.map((c) => (
                        <div key={c} className="px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 truncate" title={row[c]}>
                          {row[c] || <span className="text-gray-300">—</span>}
                        </div>
                      ))}
                      <span />
                    </div>
                  ))
                )
              ) : (
                /* Édition */
                <>
                  {rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-2 items-center mb-2"
                      style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: CONFIDENCE_COLORS.green.border }} />
                      {gridDef.columns.map((c) => (
                        <input
                          key={c}
                          value={row[c] ?? ''}
                          onChange={(e) => setCell(gridIdx, rowIdx, c, e.target.value)}
                          className="px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]"
                        />
                      ))}
                      <button onClick={() => removeRow(gridIdx, rowIdx)} aria-label="Supprimer la ligne" className="p-2 rounded text-red-400 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addRow(gridIdx)}
                    className="mt-1 flex items-center justify-center gap-2 w-full py-2 border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:bg-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Pastille de confiance (lecture seule IA). */
const Dot: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
  const color = level === 'empty' ? '#D0D5DD' : CONFIDENCE_COLORS[level].border;
  return <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />;
};

/** Niveau le plus défavorable d'une ligne (rouge > orange > vert > empty). */
function maxLevel(levels: Record<string, ConfidenceLevel>, columns: string[]): ConfidenceLevel {
  const order: ConfidenceLevel[] = ['red', 'orange', 'green', 'empty'];
  for (const lvl of order) {
    if (columns.some((c) => levels[c] === lvl)) return lvl;
  }
  return 'empty';
}

export default TablesEditor;
```

- [ ] **Step 2: Build complet (Tasks 5-7 cohérentes désormais)**

Run: `npm run build`
Expected: `Succeeded` (compilation + lint OK, 0 erreur).

- [ ] **Step 3: Lancer les tests unitaires**

Run: `npm test`
Expected: PASS (parsing + sérialisation).

- [ ] **Step 4: Commit (Tasks 5, 6, 7 ensemble — elles ne compilent qu'unies)**

```bash
git add PageFicheChantier/index.ts PageFicheChantier/types.ts PageFicheChantier/App.tsx PageFicheChantier/components/TablesEditor.tsx
git commit -m "feat: éditeur de tableaux CCTP (mode tables, onglets, toggle IA/main)"
```

---

## Task 8: Vérification finale

**Files:** aucun (vérification).

- [ ] **Step 1: Build + lint**

Run: `npm run build`
Expected: `Succeeded`, aucun warning ESLint.

- [ ] **Step 2: Tests**

Run: `npm test`
Expected: tous PASS.

- [ ] **Step 3: Vérification manuelle (`npm start`, harness PCF)**

Run: `npm start`
Vérifier dans le harness :
- 4e carte « Tableaux CCTP » visible sur le landing ; clic → écran éditeur.
- Les 4 onglets s'affichent ; onglet « Interlocuteurs externes » montre les lignes IA + pastilles 🟢🟠🔴 en mode IA Builder (lecture seule).
- Bascule « Saisie main » → grille éditable (inputs), corbeille par ligne, « Ajouter une ligne » fonctionne.
- « Enregistrer » → bouton passe à « Enregistré » (les outputs sont émis ; vérifier côté harness les valeurs de sortie non vides).
- Le formulaire principal (Voir / Créer-Modifier) et le Patch existant fonctionnent toujours (outputs `latestChange`/`schemaChange` inchangés).

- [ ] **Step 4: Mettre à jour la mémoire projet**

Mettre à jour `/Users/dylan/.claude/projects/-Users-dylan-projet-Github-PageFicheChantier/memory/cctp-ai-merge.md` : marquer la Phase B « livrée » et créer/renseigner `[[cctp-tables-editor]]` si souhaité.

- [ ] **Step 5: Commit final éventuel (docs/mémoire)**

```bash
git add -A
git commit -m "docs: Phase B livrée — éditeur de tableaux CCTP"
```

---

## Notes d'implémentation

- **YAGNI :** la table « Caractéristiques Générales » (12 colonnes) est volontairement hors scope (cf. spec). Ajouter une section ultérieure = une entrée dans `SECTION_DEFS`.
- **Immutabilité :** tous les handlers d'édition recréent les objets (`{ ...r }`, `.map`), jamais de mutation en place de l'état React.
- **Toggle non persisté :** `mode` est un état local UI ; seules les valeurs de grille sont sérialisées/émises.
- **Sérialisation uniforme :** chaque section est émise comme `{ grids: [{ key, columns, rows }] }` (la section « rédaction » contient 2 grilles). Côté Power Apps, parser ce JSON par colonne.
- **Ne pas toucher** aux outputs `latestChange`/`navigationRequest`/`schemaChange` ni au flux `handleSave`/Patch (Phase A et formulaire).
