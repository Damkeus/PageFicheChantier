import { ConfidenceLevel, confidenceLevel, normalizeFieldName } from './confidence';

export type SectionId = 'externes' | 'client' | 'redaction' | 'sps' | 'soustraitants';

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
  {
    id: 'soustraitants',
    label: 'Sous-traitants',
    outputKey: 'cctpSousTraitants',
    grids: [{ key: 'soustraitants', aiTableNames: ['Sous-traitants', 'Sous-traitant', 'Sous Traitants'], columns: ['Entreprise', 'Nom', 'Mail', 'N° Téléphone', 'Prestation'] }],
  },
];

export type GridRow = Record<string, string>;

export interface ParsedGrid {
  key: string;
  title?: string;
  columns: string[];
  rows: GridRow[];
  levels: Record<string, ConfidenceLevel>[];
}

export interface ParsedSection {
  id: SectionId;
  label: string;
  outputKey: string;
  grids: ParsedGrid[];
}

interface RawCell { value?: unknown; text?: unknown; displayName?: string; confidence?: number; }
interface RawTable { displayName?: string; entries?: Record<string, unknown>[]; }

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
  const levels: Record<string, ConfidenceLevel>[] = [];
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
  if (cctpJson?.trim()) {
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

/**
 * Lignes éditables d'amorçage pour une grille : copie des lignes IA, ou UNE
 * ligne blanche si l'IA n'a rien extrait (cf. spec « 1 ligne blanche si l'IA
 * n'a rien extrait »).
 */
export function seedRows(grid: ParsedGrid): GridRow[] {
  return grid.rows.length > 0
    ? grid.rows.map((r) => ({ ...r }))
    : [emptyRow(grid.columns)];
}

/* ------------------------------------------------------------------------- *
 * Relecture des tableaux DÉJÀ ENREGISTRÉS (colonnes SharePoint).
 *
 * Power Apps renvoie les 5 colonnes dans une propriété d'entrée unique, via
 * `JSON({externes: ThisItem.Col…, client: …})`. Les valeurs sont donc des
 * CHAÎNES contenant elles-mêmes du JSON (double encodage) — mais on accepte
 * aussi des objets déjà décodés, et les clés `outputKey` du manifest.
 *
 * Règle métier : ce qui est enregistré prime toujours sur l'extraction IA.
 * ------------------------------------------------------------------------- */

export type SavedTables = Partial<Record<SectionId, SerializedGrid[]>>;

/** Clés acceptées dans le JSON combiné : SectionId ('externes') ou outputKey. */
const SECTION_BY_KEY: Map<string, SectionId> = (() => {
  const m = new Map<string, SectionId>();
  for (const def of SECTION_DEFS) {
    m.set(def.id.toLowerCase(), def.id);
    m.set(def.outputKey.toLowerCase(), def.id);
  }
  return m;
})();

function cellString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Décode une section : objet déjà parsé OU chaîne JSON (double encodage). */
function coerceSavedSection(raw: unknown): SerializedGrid[] | undefined {
  let value = raw;
  if (typeof value === 'string') {
    if (!value.trim()) return undefined;
    try { value = JSON.parse(value); } catch { return undefined; }
  }
  if (!value || typeof value !== 'object') return undefined;
  const grids = (value as { grids?: unknown }).grids;
  if (!Array.isArray(grids)) return undefined;

  const out: SerializedGrid[] = [];
  for (const g of grids) {
    if (!g || typeof g !== 'object') continue;
    const grid = g as { key?: unknown; columns?: unknown; rows?: unknown };
    out.push({
      key: typeof grid.key === 'string' ? grid.key : '',
      columns: Array.isArray(grid.columns) ? grid.columns.filter((c): c is string => typeof c === 'string') : [],
      rows: Array.isArray(grid.rows)
        ? grid.rows.filter((r): r is GridRow => !!r && typeof r === 'object' && !Array.isArray(r))
        : [],
    });
  }
  return out;
}

/** Parse le JSON combiné des colonnes enregistrées. Jamais d'exception. */
export function parseSavedTables(json: string | undefined | null): SavedTables {
  const out: SavedTables = {};
  if (!json?.trim()) return out;

  let root: unknown;
  try { root = JSON.parse(json); } catch { return out; }
  if (!root || typeof root !== 'object') return out;

  for (const [key, raw] of Object.entries(root as Record<string, unknown>)) {
    const id = SECTION_BY_KEY.get(key.trim().toLowerCase());
    if (!id) continue;
    const grids = coerceSavedSection(raw);
    if (grids) out[id] = grids;
  }
  return out;
}

/**
 * Vrai si la section enregistrée contient au moins une cellule non vide.
 * Une section réduite à des lignes blanches ne doit PAS masquer l'onglet IA.
 */
export function hasSavedRows(grids: SerializedGrid[] | undefined): boolean {
  return !!grids?.some((g) => g.rows.some((r) => Object.values(r).some((v) => cellString(v).trim() !== '')));
}

/**
 * Lignes éditables issues de l'enregistrement, normalisées sur les colonnes
 * courantes (appariement par `normalizeFieldName`, colonnes manquantes vides).
 * Les lignes entièrement vides sont écartées ; au moins une ligne blanche est
 * rendue pour garder une grille éditable.
 */
export function seedRowsFromSaved(def: GridDef, saved?: SerializedGrid): GridRow[] {
  const rows: GridRow[] = [];
  for (const raw of saved?.rows ?? []) {
    const byNorm = new Map<string, string>();
    for (const [k, v] of Object.entries(raw)) byNorm.set(normalizeFieldName(k), cellString(v));

    const row = emptyRow(def.columns);
    for (const c of def.columns) row[c] = byNorm.get(normalizeFieldName(c)) ?? '';
    if (def.columns.some((c) => row[c].trim() !== '')) rows.push(row);
  }
  return rows.length > 0 ? rows : [emptyRow(def.columns)];
}

/** Amorçage complet d'une section depuis l'enregistrement (grille par grille). */
export function seedSectionFromSaved(def: SectionDef, grids: SerializedGrid[] | undefined): GridRow[][] {
  return def.grids.map((g, i) => seedRowsFromSaved(g, grids?.find((s) => s.key === g.key) ?? grids?.[i]));
}
