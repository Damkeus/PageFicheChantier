import { describe, it, expect } from 'vitest';
import { AccessoryOption, buildAccessoryLabels } from '../PageFicheChantier/accessories';
import {
  CableOption,
  accessoryTypeOf,
  bestCompatibility,
  cableLabel,
  cableShortLabel,
  compatibility,
  findSelectedCables,
  isCableRow,
  parseMetals,
  parseSectionMm2,
  parseTensionKv,
  setQuantity,
  toAccessorySpecs,
  toCableSpec,
} from '../PageFicheChantier/accessoryCatalog';

// Extraits réels : `JSON(colCables)` (Table Cable) et `JSON(colAccessoires)` (Table Accessoires).
const CABLE_90_1600_AL: CableOption = {
  ID: 4, Title: 'Câbles 90 kV', Section: '1600 mm²', Tension: '90 kV', OData__x00c2_me: 'Al', Typedecomposant: 'Câble',
};
const CABLE_225_1200_ALU_CPR: CableOption = {
  ID: 8, Title: 'Câbles 225 kV', Section: '1200 mm²', Tension: '225 kV', OData__x00c2_me: 'Alu', Typedecomposant: 'Câble CPR B2CA',
};
const CABLE_TERRE_120: CableOption = {
  ID: 37, Title: 'Câbles de MALT', Section: '120 mm²', R_x00e9_f_x00e9_rence: '1000RO2V 120²', Typedecomposant: 'Câble de terre',
};
const EXTREMITES_ROW: CableOption = {
  ID: 41, Title: 'Extrémités 90 kV', Section: '≤ 1600 mm²', Tension: '90 kV', Typedecomposant: 'Extrémité',
};

const ACCESSORIES: AccessoryOption[] = [
  { ID: 269, Title: 'Extrémité extérieure', Ame: 'Al', field_10: '1600', field_11: '90', field_2: '10565574', field_5: 'Extrémité 90 kV extérieure synthétique autoporteuse - 1 600 mm²' },
  { ID: 270, Title: 'Extrémité extérieure', Ame: 'Cu', field_10: '1600', field_11: '90', field_2: '10562845' },
  { ID: 267, Title: 'Extrémité extérieure', Ame: 'Al', field_10: '1200', field_11: '90' },
  { ID: 305, Title: 'PSEM mâle', Ame: 'Al', field_10: '1600', field_11: '90' },
  { ID: 306, Title: 'PSEM mâle', Ame: 'Cu', field_10: 'N/A', field_11: '90' },
  { ID: 325, Title: 'Jonction rubannée', field_10: 'N/A', field_11: '90' },
  { ID: 332, Title: 'Jonction sans Malt', Ame: 'Al/Cu', field_10: '1600', field_11: '90' },
  { ID: 335, Title: "Jonction avec arret d'écran - puit permutation", Ame: 'Al/Cu', field_10: '1600', field_11: '90' },
  { ID: 341, Title: 'Jonction avec Malt', Ame: 'Al/Cu', field_10: '1600', field_11: '90' },
  { ID: 344, Title: 'Jonction sans Malt', Ame: 'Al', field_10: '1600', field_11: '225' },
  { ID: 329, Title: 'Bague de malt', field_10: '1600', field_11: '90' },
  { ID: 384, Title: 'Coffret de Malt', field_10: 'N/A', field_11: '90' },
  { ID: 386, Title: 'Manchon de Malt', field_10: '120', field_11: 'N/A' },
  { ID: 382, Title: 'Chassis permutation', field_10: '120', field_11: '90' },
  { ID: 274, Title: 'Support autoporteur', Ame: 'Al', field_10: '1600', field_11: '90' },
  { ID: 390, Title: 'Autres' },
];
const SPECS = toAccessorySpecs(ACCESSORIES, buildAccessoryLabels(ACCESSORIES));
const spec = (id: number) => SPECS.find((s) => s.id === id)!;

describe('parsers', () => {
  it('reads tension from both tables', () => {
    expect(parseTensionKv('90 kV')).toBe(90);
    expect(parseTensionKv('225')).toBe(225);
    expect(parseTensionKv('N/A')).toBeUndefined();
    expect(parseTensionKv(undefined)).toBeUndefined();
  });

  it('reads a section but refuses ranges and combinations', () => {
    expect(parseSectionMm2('1600 mm²')).toBe(1600);
    expect(parseSectionMm2('1 200 mm²')).toBe(1200);
    expect(parseSectionMm2('N/A')).toBeUndefined();
    expect(parseSectionMm2('≤ 1600 mm²')).toBeUndefined();
    expect(parseSectionMm2('2000/2500 mm²')).toBeUndefined();
  });

  it('normalises every core spelling', () => {
    expect(parseMetals('Al')).toEqual(['Al']);
    expect(parseMetals('alu')).toEqual(['Al']);
    expect(parseMetals('Cu Em')).toEqual(['CuE']);
    expect(parseMetals('Cu-CuE')).toEqual(['Cu', 'CuE']);
    expect(parseMetals('Al/Cu')).toEqual(['Al', 'Cu']);
    expect(parseMetals('CuE/Al')).toEqual(['CuE', 'Al']);
    expect(parseMetals(undefined)).toEqual([]);
  });
});

describe('cables', () => {
  it('keeps only cable rows of the Table Cable', () => {
    expect(isCableRow(CABLE_90_1600_AL)).toBe(true);
    expect(isCableRow(CABLE_225_1200_ALU_CPR)).toBe(true);
    expect(isCableRow(CABLE_TERRE_120)).toBe(true);
    expect(isCableRow(EXTREMITES_ROW)).toBe(false);
  });

  it('builds the historical label and a short label', () => {
    expect(cableLabel(CABLE_90_1600_AL)).toBe('Câbles 90 kV - 1600 mm² - Al');
    expect(cableShortLabel(toCableSpec(CABLE_90_1600_AL))).toBe('90 kV · 1600 mm² · Al');
    expect(cableShortLabel(toCableSpec(CABLE_TERRE_120))).toBe('Terre · 120 mm²');
  });

  it('finds selected cables by id first, then by label', () => {
    const options = [CABLE_90_1600_AL, CABLE_225_1200_ALU_CPR, CABLE_TERRE_120];
    expect(findSelectedCables(options, [], [8])).toEqual([CABLE_225_1200_ALU_CPR]);
    expect(findSelectedCables(options, ['Câbles 90 kV - 1600 mm² - Al'], [])).toEqual([CABLE_90_1600_AL]);
    // Ancien chargement : `cables` contenait la tension brute, qui ne désigne aucun câble.
    expect(findSelectedCables(options, ['90 kV'], [])).toEqual([]);
  });
});

describe('accessory types', () => {
  it.each([
    ['Extrémité extérieure', 'extremite'],
    ['Extrémité oléot', 'extremite'],
    ['PSEM femelle', 'psem'],
    ["Jonction avec arret d'écran - puit permutation", 'jonction_ae'],
    ["Jonction avec arrêt d'écran  - permutation direct", 'jonction_ae'],
    ['Jonction avec Malt', 'jonction_malt'],
    ['Jonction sans Malt', 'jonction'],
    ['Jonction Oléo ', 'jonction'],
    ['Support autoporteur', 'support'],
    ['Bague de malt', 'malt'],
    ['Chassis permutation', 'malt'],
    ['Autres', 'autre'],
    [undefined, 'autre'],
  ])('%s → %s', (title, key) => {
    expect(accessoryTypeOf(title)).toBe(key);
  });
});

describe('compatibility — câble 90 kV 1600 mm² Al', () => {
  const cable = toCableSpec(CABLE_90_1600_AL);

  it('is exact when tension, section and core all match', () => {
    expect(compatibility(spec(269), cable)).toBe('exact');
    expect(compatibility(spec(305), cable)).toBe('exact');
    expect(compatibility(spec(332), cable)).toBe('exact'); // Al/Cu couvre Al
  });

  it('rejects another section, core or tension', () => {
    expect(compatibility(spec(267), cable)).toBe('none'); // 1200 mm²
    expect(compatibility(spec(270), cable)).toBe('none'); // Cu
    expect(compatibility(spec(344), cable)).toBe('none'); // 225 kV
    expect(compatibility(spec(306), cable)).toBe('none'); // Cu, même sans section
  });

  it('keeps accessories with missing data as generic', () => {
    expect(compatibility(spec(325), cable)).toBe('generic');
    expect(compatibility(spec(329), cable)).toBe('generic');
    expect(compatibility(spec(384), cable)).toBe('generic');
    expect(compatibility(spec(390), cable)).toBe('generic');
  });

  it('excludes earth-cable equipment sized for 120 mm²', () => {
    expect(compatibility(spec(386), cable)).toBe('none');
    expect(compatibility(spec(382), cable)).toBe('none');
  });
});

describe('compatibility — several cables', () => {
  const cables = [toCableSpec(CABLE_90_1600_AL), toCableSpec(CABLE_TERRE_120)];

  it('takes the best level across the selected cables', () => {
    expect(bestCompatibility(spec(269), cables)).toBe('exact');
    expect(bestCompatibility(spec(386), cables)).toBe('generic'); // manchon 120 mm² ↔ câble de terre
    expect(bestCompatibility(spec(382), cables)).toBe('generic');
    expect(bestCompatibility(spec(344), cables)).toBe('none');
  });

  it('shows everything as generic without cable', () => {
    expect(bestCompatibility(spec(344), [])).toBe('generic');
  });
});

describe('setQuantity', () => {
  it('adds, grows, shrinks and removes without reordering', () => {
    expect(setQuantity([], 'A', 1)).toEqual(['A']);
    expect(setQuantity(['B', 'A', 'C'], 'A', 3)).toEqual(['B', 'A', 'A', 'A', 'C']);
    expect(setQuantity(['B', 'A', 'A', 'C'], 'A', 1)).toEqual(['B', 'A', 'C']);
    expect(setQuantity(['B', 'A', 'C'], 'A', 0)).toEqual(['B', 'C']);
  });
});

describe('description fallback and data warnings', () => {
  const opts: AccessoryOption[] = [
    // Section « N/A » mais la description la donne.
    { ID: 306, Title: 'PSEM mâle', Ame: 'Cu', field_10: 'N/A', field_11: '90', field_5: 'Extrémité 90 kV PSEM ou TR - [SF6] - 1600 mm² - partie mâle' },
    // field_10 contredit la description.
    { ID: 304, Title: 'PSEM mâle', Ame: 'Al', field_10: '1600', field_11: '90', field_2: '10520465', field_5: 'Extrémité 90 kV PSEM ou TR - [SF6] - 1200 mm² - partie mâle' },
    // Espace insécable dans « 1 600 » : pas une contradiction.
    { ID: 269, Title: 'Extrémité extérieure', Ame: 'Al', field_10: '1600', field_11: '90', field_5: 'Extrémité 90 kV extérieure synthétique autoporteuse - 1 600 mm²' },
    // Tension absente, rien à déduire.
    { ID: 388, Title: 'Jonction Oléo ', field_10: '375', field_11: 'N/A' },
    // Tension déduite de la description.
    { ID: 999, Title: 'Coffret de Malt', field_10: 'N/A', field_5: 'Coffret MALT 225 kV' },
  ];
  const specs = toAccessorySpecs(opts, buildAccessoryLabels(opts));
  const byId = (id: number) => specs.find((s) => s.id === id)!;

  it('fills a missing section or tension from the description', () => {
    expect(byId(306).sectionMm2).toBe(1600);
    expect(byId(306).warnings).toEqual([]);
    expect(byId(999).tensionKv).toBe(225);
    expect(byId(388).tensionKv).toBeUndefined();
  });

  it('keeps the column value but flags a contradiction with the description', () => {
    expect(byId(304).sectionMm2).toBe(1600);
    expect(byId(304).warnings).toEqual(['Section 1600 mm² ≠ description (1200 mm²)']);
  });

  it('does not flag formatting differences', () => {
    expect(byId(269).warnings).toEqual([]);
  });
});
