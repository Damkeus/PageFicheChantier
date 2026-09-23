/**
 * Catalogue câbles → accessoires pour le wizard de l'onglet Accessoires.
 *
 * Fonctions pures uniquement : normalisation des deux référentiels SharePoint, typage des
 * accessoires, règle de compatibilité câble ↔ accessoire. Aucun import d'UI ni d'image.
 *
 * Les deux listes ne parlent pas la même langue :
 *   - "Table Cable"        : Tension « 90 kV », Section « 1600 mm² » ou « ≤ 1600 mm² »,
 *                            âme dans `OData__x00c2_me` (« Al », « Alu », « Cu Em »…),
 *                            et des lignes qui ne sont pas des câbles (Typedecomposant
 *                            « Extrémité », « Jonction »).
 *   - "Table Accessoires"  : field_11 « 90 » ou « N/A », field_10 « 1600 » ou « N/A »,
 *                            Ame « alu », « CuE », « Al/Cu », « Cu-CuE »… ou absente.
 * Tout est ramené à des nombres (kV, mm²) et à un jeu d'âmes normalisées avant comparaison.
 */

import { AccessoryOption, accessoryId } from './accessories';

export interface CableOption {
  ID?: number;
  Id?: number;
  Title: string;
  Section?: string;
  Ame?: string;
  D_x00e9_tailssuppl_x00e9_mentair?: string;
  Tension?: string;
  _x00c2_me?: string;
  OData__x00c2_me?: string;
  Typedecomposant?: string;
  R_x00e9_f_x00e9_rence?: string;
}

export type Metal = 'Al' | 'Cu' | 'CuE';

export interface CableSpec {
  id?: number;
  /** Libellé historique, clé de sélection dans `ProjectData.cables`. */
  label: string;
  title: string;
  tensionKv?: number;
  sectionMm2?: number;
  metals: Metal[];
  details?: string;
  reference?: string;
  isEarth: boolean;
}

export type AccessoryTypeKey =
  | 'extremite'
  | 'psem'
  | 'jonction'
  | 'jonction_ae'
  | 'jonction_malt'
  | 'support'
  | 'malt'
  | 'autre';

export interface AccessoryTypeDef {
  key: AccessoryTypeKey;
  label: string;
  test: RegExp;
}

/**
 * Ordre = priorité de détection. « PSEM » avant « Extrémité » (les PSEM sont décrites
 * comme des extrémités), les jonctions spécialisées avant la jonction générique.
 */
export const ACCESSORY_TYPES: readonly AccessoryTypeDef[] = [
  { key: 'psem', label: 'Extrémité PSEM / TR', test: /psem/i },
  { key: 'extremite', label: 'Extrémité', test: /^extr[ée]mit[ée]/i },
  { key: 'jonction_ae', label: "Jonction arrêt d'écran", test: /jonction.*arr[êe]t d.?[ée]cran/i },
  { key: 'jonction_malt', label: 'Jonction avec MALT', test: /jonction\s+avec\s+malt/i },
  { key: 'jonction', label: 'Jonction', test: /jonction/i },
  { key: 'support', label: 'Support', test: /support/i },
  { key: 'malt', label: 'Mise à la terre', test: /malt|ch[âa]ssis/i },
  { key: 'autre', label: 'Autres', test: /(?:)/ },
];

export interface AccessorySpec {
  id?: number;
  /** Libellé unique produit par `buildAccessoryLabels`, clé de sélection. */
  label: string;
  type: AccessoryTypeKey;
  title: string;
  description?: string;
  sap?: string;
  tensionKv?: number;
  sectionMm2?: number;
  metals: Metal[];
  /** Incohérences entre colonnes et description, à montrer sans bloquer la sélection. */
  warnings: string[];
}

/** `exact` : tension, section et âme renseignées des deux côtés et égales. */
export type Compatibility = 'exact' | 'generic' | 'none';

const isNotApplicable = (raw: string): boolean => /^\s*(n\/?a|-)?\s*$/i.test(raw);

const firstNumber = (raw: string): number | undefined => {
  const match = /\d+(?:[.,]\d+)?/.exec(raw.replace(/\s+/g, ''));
  return match ? Number(match[0].replace(',', '.')) : undefined;
};

export const parseTensionKv = (raw?: string): number | undefined =>
  raw === undefined || isNotApplicable(raw) ? undefined : firstNumber(raw);

/**
 * Une plage (« ≤ 1600 mm² ») ou une combinaison (« 2000/2500 mm² », « 1600 CuE / 2500 Al »)
 * n'est pas une section : on la traite comme non renseignée plutôt que d'en garder un
 * morceau qui filtrerait à tort.
 */
export const parseSectionMm2 = (raw?: string): number | undefined => {
  if (raw === undefined || isNotApplicable(raw)) return undefined;
  if (/[≤<>/]/.test(raw)) return undefined;
  return firstNumber(raw);
};

export const parseMetals = (raw?: string): Metal[] => {
  if (!raw) return [];
  const tokens = raw
    .toLowerCase()
    .replace(/cu\s*em/g, 'cue')
    .split(/[\s/,-]+/)
    .filter(Boolean);
  const metals = tokens
    .map((t): Metal | undefined => {
      if (t.startsWith('al')) return 'Al';
      if (t === 'cue') return 'CuE';
      if (t.startsWith('cu')) return 'Cu';
      return undefined;
    })
    .filter((m): m is Metal => m !== undefined);
  return [...new Set(metals)];
};

export const cableId = (opt: CableOption): number | undefined => opt.ID ?? opt.Id;

/** Même format que le mapper historique : c'est la clé stockée dans `ProjectData.cables`. */
export const cableLabel = (opt: CableOption): string =>
  [
    opt.Title,
    opt.Section,
    opt.Ame,
    opt.D_x00e9_tailssuppl_x00e9_mentair,
    opt._x00c2_me,
    opt.OData__x00c2_me,
  ]
    .filter(Boolean)
    .join(' - ');

/** La "Table Cable" contient aussi des extrémités et des jonctions : on ne garde que les câbles. */
export const isCableRow = (opt: CableOption): boolean =>
  /^c[âa]ble/i.test((opt.Typedecomposant || opt.Title || '').trim());

export const toCableSpec = (opt: CableOption): CableSpec => ({
  id: cableId(opt),
  label: cableLabel(opt),
  title: opt.Title,
  tensionKv: parseTensionKv(opt.Tension),
  sectionMm2: parseSectionMm2(opt.Section),
  metals: parseMetals(opt.OData__x00c2_me || opt._x00c2_me || opt.Ame),
  details: opt.D_x00e9_tailssuppl_x00e9_mentair,
  reference: opt.R_x00e9_f_x00e9_rence,
  isEarth: /terre|malt/i.test(`${opt.Typedecomposant ?? ''} ${opt.Title}`),
});

export const accessoryTypeOf = (title?: string): AccessoryTypeKey => {
  const text = (title ?? '').trim();
  return (ACCESSORY_TYPES.find((t) => t.test.test(text)) ?? ACCESSORY_TYPES[ACCESSORY_TYPES.length - 1]).key;
};

export const accessoryTypeLabel = (key: AccessoryTypeKey): string =>
  ACCESSORY_TYPES.find((t) => t.key === key)?.label ?? key;

// « 1 600 mm² » : groupes de milliers séparés par espace, insécable ou fine.
const DESCRIPTION_SECTION = /(\d{1,3}(?:[\s\u00a0\u202f]\d{3})+|\d+)\s*mm/i;
const DESCRIPTION_TENSION = /(\d+)\s*kV/i;

const fromDescription = (description: string | undefined, pattern: RegExp): number | undefined => {
  const match = description ? pattern.exec(description) : null;
  return match ? Number(match[1].replace(/\D/g, '')) : undefined;
};

interface Resolved {
  value?: number;
  warning?: string;
}

/**
 * La colonne fait foi ; la description ne sert qu'à combler un vide (« N/A », absente).
 * Quand les deux existent et divergent, on garde la colonne et on le signale : c'est la
 * table qu'il faut corriger, pas au wizard de deviner.
 */
const resolveWithDescription = (
  column: number | undefined,
  described: number | undefined,
  name: string,
  unit: string,
): Resolved => {
  if (column === undefined) return { value: described };
  if (described !== undefined && described !== column) {
    return { value: column, warning: `${name} ${column} ${unit} ≠ description (${described} ${unit})` };
  }
  return { value: column };
};

/** `labels[i]` doit être le libellé de `options[i]` (sortie de `buildAccessoryLabels`). */
export const toAccessorySpecs = (options: AccessoryOption[], labels: string[]): AccessorySpec[] =>
  options.map((opt, i) => {
    const description = opt.field_5?.trim() || undefined;
    const tension = resolveWithDescription(
      parseTensionKv(opt.field_11), fromDescription(description, DESCRIPTION_TENSION), 'Tension', 'kV',
    );
    const section = resolveWithDescription(
      parseSectionMm2(opt.field_10), fromDescription(description, DESCRIPTION_SECTION), 'Section', 'mm²',
    );
    return {
      id: accessoryId(opt),
      label: labels[i],
      type: accessoryTypeOf(opt.Title),
      title: opt.Title?.trim() ?? '',
      description,
      sap: opt.field_2,
      tensionKv: tension.value,
      sectionMm2: section.value,
      metals: parseMetals(opt.Ame),
      warnings: [tension.warning, section.warning].filter((w): w is string => w !== undefined),
    };
  });

type Dimension = 'match' | 'unknown' | 'mismatch';

const compareValue = (a?: number, b?: number): Dimension => {
  if (a === undefined || b === undefined) return 'unknown';
  return a === b ? 'match' : 'mismatch';
};

const compareMetals = (a: Metal[], b: Metal[]): Dimension => {
  if (a.length === 0 || b.length === 0) return 'unknown';
  return a.some((m) => b.includes(m)) ? 'match' : 'mismatch';
};

/**
 * Une donnée absente d'un côté ne disqualifie pas (coffret MALT sans section, câble de
 * terre sans tension, « Autres ») ; une donnée présente et différente, si.
 */
export const compatibility = (acc: AccessorySpec, cable: CableSpec): Compatibility => {
  const dims = [
    compareValue(acc.tensionKv, cable.tensionKv),
    compareValue(acc.sectionMm2, cable.sectionMm2),
    compareMetals(acc.metals, cable.metals),
  ];
  if (dims.includes('mismatch')) return 'none';
  return dims.every((d) => d === 'match') ? 'exact' : 'generic';
};

/** Meilleure compatibilité de l'accessoire parmi les câbles donnés. Sans câble : tout est générique. */
export const bestCompatibility = (acc: AccessorySpec, cables: CableSpec[]): Compatibility => {
  if (cables.length === 0) return 'generic';
  const levels = cables.map((c) => compatibility(acc, c));
  if (levels.includes('exact')) return 'exact';
  return levels.includes('generic') ? 'generic' : 'none';
};

/** Retrouve les câbles sélectionnés par ID d'abord (stable), puis par libellé. */
export const findSelectedCables = (
  options: CableOption[],
  labels: string[] = [],
  ids: number[] = [],
): CableOption[] =>
  options.filter((opt) => {
    const id = cableId(opt);
    return (id !== undefined && ids.includes(id)) || labels.includes(cableLabel(opt));
  });

/** Libellé court d'un câble : « 90 kV · 1600 mm² · Al ». */
export const cableShortLabel = (spec: CableSpec): string =>
  [
    spec.tensionKv !== undefined ? `${spec.tensionKv} kV` : spec.isEarth ? 'Terre' : undefined,
    spec.sectionMm2 !== undefined ? `${spec.sectionMm2} mm²` : undefined,
    spec.metals.join('/') || undefined,
    spec.details,
  ]
    .filter(Boolean)
    .join(' · ');

/** Occurrences d'un libellé dans la sélection (la quantité est portée par la répétition). */
export const countSelections = (selected: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const label of selected) counts.set(label, (counts.get(label) ?? 0) + 1);
  return counts;
};

export const setQuantity = (selected: string[], label: string, quantity: number): string[] => {
  const others = selected.filter((l) => l !== label);
  const firstIndex = selected.indexOf(label);
  const block = Array<string>(Math.max(0, quantity)).fill(label);
  if (firstIndex === -1) return [...others, ...block];
  // Garde la position d'origine dans la liste pour ne pas réordonner le récapitulatif.
  const before = selected.slice(0, firstIndex).filter((l) => l !== label);
  return [...before, ...block, ...others.slice(before.length)];
};
