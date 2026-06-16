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
