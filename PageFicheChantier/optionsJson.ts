/**
 * Lecture des référentiels poussés par Power Apps (`accessoriesOptions`, `cablesOptions`).
 *
 * Le composant ne choisit pas ce qu'il reçoit : selon la formule côté app, on peut avoir un
 * tableau (`JSON(col)`), un seul enregistrement (`JSON(First(col))`), une enveloppe OData
 * `{ value: [...] }`, une chaîne JSON ré-encodée, ou une colonne numérique / de choix au
 * lieu d'un texte. Tout est ramené ici à la forme texte attendue par le wizard, pour
 * qu'une formule un peu différente ne fasse jamais planter l'onglet.
 */

import { AccessoryOption } from './accessories';
import { CableOption } from './accessoryCatalog';

type Row = Record<string, unknown>;

const isRow = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);

const toRows = (value: unknown, depth = 0): Row[] => {
  if (Array.isArray(value)) return value.filter(isRow);
  if (typeof value === 'string' && depth === 0) {
    try {
      return toRows(JSON.parse(value), depth + 1);
    } catch {
      return [];
    }
  }
  if (isRow(value)) return Array.isArray(value.value) ? value.value.filter(isRow) : [value];
  return [];
};

/** Lignes objet d'un JSON Power Apps ; `[]` pour tout ce qui n'est pas exploitable. */
export const parseJsonRows = (json?: string | null): Row[] => {
  if (!json?.trim()) return [];
  try {
    return toRows(JSON.parse(json));
  } catch {
    return [];
  }
};

/** Texte d'une cellule : chaîne, nombre, ou colonne de choix / lookup (`{ Value }`). */
const text = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRow(value)) return text(value.Value);
  return undefined;
};

const id = (row: Row): number | undefined => {
  const raw = row.ID ?? row.Id;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isInteger(n) ? n : undefined;
};

/** Construit l'objet sans clés `undefined`, pour des comparaisons et un debug lisibles. */
const pick = <T>(entries: [string, unknown][]): T =>
  Object.fromEntries(entries.filter(([, v]) => v !== undefined)) as T;

const CABLE_TEXT_FIELDS = [
  'Section',
  'Tension',
  'Ame',
  'D_x00e9_tailssuppl_x00e9_mentair',
  '_x00c2_me',
  'OData__x00c2_me',
  'Typedecomposant',
  'R_x00e9_f_x00e9_rence',
] as const;

const ACCESSORY_TEXT_FIELDS = ['Ame', 'field_2', 'field_3', 'field_5', 'field_10', 'field_11'] as const;

export const parseCableOptions = (json?: string | null): CableOption[] =>
  parseJsonRows(json)
    .filter((row) => text(row.Title) !== undefined)
    .map((row) =>
      pick<CableOption>([
        ['ID', id(row)],
        ['Title', text(row.Title)],
        ...CABLE_TEXT_FIELDS.map((f): [string, unknown] => [f, text(row[f])]),
      ]),
    );

export const parseAccessoryOptions = (json?: string | null): AccessoryOption[] =>
  parseJsonRows(json)
    .filter((row) => text(row.Title) !== undefined)
    .map((row) =>
      pick<AccessoryOption>([
        ['ID', id(row)],
        ['Title', text(row.Title)],
        ...ACCESSORY_TEXT_FIELDS.map((f): [string, unknown] => [f, text(row[f])]),
      ]),
    );
