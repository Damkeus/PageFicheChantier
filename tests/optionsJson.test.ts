import { describe, it, expect } from 'vitest';
import { parseAccessoryOptions, parseCableOptions, parseJsonRows } from '../PageFicheChantier/optionsJson';
import { AccessoryOption, buildAccessoryLabels, relabelAccessories } from '../PageFicheChantier/accessories';

// Ligne réelle de `JSON(colCables)` : métadonnées SharePoint incluses.
const REAL_CABLE_ROW = {
  Author: { Claims: 'i:0#.f|membership|x@nexans.com', DisplayName: 'X' },
  Created: '2026-01-26T10:01:17.000Z',
  ID: 4,
  OData__x00c2_me: 'Al',
  Section: '1600 mm²',
  Tension: '90 kV',
  Title: 'Câbles 90 kV',
  Typedecomposant: 'Câble',
  '{ContentType}': { Id: '0x0100', Name: 'Item' },
  '{Thumbnail}': { Large: null, Medium: null, Small: null },
};

describe('parseJsonRows — formes envoyées par Power Apps', () => {
  it('reads a plain array', () => {
    expect(parseJsonRows('[{"ID":1},{"ID":2}]')).toEqual([{ ID: 1 }, { ID: 2 }]);
  });

  it('returns [] for empty, invalid or null input', () => {
    expect(parseJsonRows(undefined)).toEqual([]);
    expect(parseJsonRows('')).toEqual([]);
    expect(parseJsonRows('   ')).toEqual([]);
    expect(parseJsonRows('{pas du json')).toEqual([]);
    expect(parseJsonRows('null')).toEqual([]);
    expect(parseJsonRows('42')).toEqual([]);
  });

  it('accepts a single record (JSON(First(col)))', () => {
    expect(parseJsonRows('{"ID":7}')).toEqual([{ ID: 7 }]);
  });

  it('unwraps an OData envelope', () => {
    expect(parseJsonRows('{"value":[{"ID":1}]}')).toEqual([{ ID: 1 }]);
  });

  it('unwraps a double-encoded string', () => {
    expect(parseJsonRows(JSON.stringify('[{"ID":3}]'))).toEqual([{ ID: 3 }]);
  });

  it('drops non-object rows', () => {
    expect(parseJsonRows('[{"ID":1}, null, "x", 3, [1]]')).toEqual([{ ID: 1 }]);
  });
});

describe('parseCableOptions', () => {
  it('keeps the useful fields of a real SharePoint row', () => {
    expect(parseCableOptions(JSON.stringify([REAL_CABLE_ROW]))).toEqual([
      { ID: 4, Title: 'Câbles 90 kV', Section: '1600 mm²', Tension: '90 kV', OData__x00c2_me: 'Al', Typedecomposant: 'Câble' },
    ]);
  });

  it('coerces numbers, choice objects and string ids', () => {
    const [cable] = parseCableOptions(
      '[{"Id":"12","Title":"Câbles 225 kV","Section":2000,"Tension":{"Value":"225 kV"},"OData__x00c2_me":{"Value":"Cu"}}]',
    );
    expect(cable).toEqual({ ID: 12, Title: 'Câbles 225 kV', Section: '2000', Tension: '225 kV', OData__x00c2_me: 'Cu' });
  });

  it('drops rows without title', () => {
    expect(parseCableOptions('[{"ID":1},{"ID":2,"Title":"Câbles 90 kV"}]')).toHaveLength(1);
  });
});

describe('parseAccessoryOptions', () => {
  it('normalises numeric section and tension columns', () => {
    const [acc] = parseAccessoryOptions('[{"ID":269,"Title":"Extrémité extérieure","field_10":1600,"field_11":90,"field_2":10565574,"Ame":"Al"}]');
    expect(acc).toEqual({ ID: 269, Title: 'Extrémité extérieure', field_10: '1600', field_11: '90', field_2: '10565574', Ame: 'Al' });
  });

  it('keeps an accessory without optional columns', () => {
    expect(parseAccessoryOptions('[{"ID":390,"Title":"Autres"}]')).toEqual([{ ID: 390, Title: 'Autres' }]);
  });
});

describe('relabelAccessories — référentiel rechargé', () => {
  const before: AccessoryOption[] = [
    { ID: 271, Title: 'Support autoporteur', Ame: 'Al', field_10: '630', field_11: '90', field_5: 'Système auto-porteur pour extrémités 90 kV' },
  ];
  // Une ligne identique arrive : les libellés prennent un suffixe SAP pour rester uniques.
  const after: AccessoryOption[] = [
    { ...before[0], field_2: '10526802' },
    { ID: 999, Title: 'Support autoporteur', Ame: 'Al', field_10: '630', field_11: '90', field_2: '10599999', field_5: 'Système auto-porteur pour extrémités 90 kV' },
  ];
  const oldLabel = buildAccessoryLabels(before)[0];
  const newLabel = buildAccessoryLabels(after)[0];

  it('moves the selection to the current label, keeping quantities', () => {
    expect(newLabel).not.toBe(oldLabel);
    const entries = [{ id: 271, value: oldLabel, quantity: 2 }];
    expect(relabelAccessories([oldLabel, oldLabel], after, entries)).toEqual([newLabel, newLabel]);
  });

  it('keeps unresolved labels untouched so they are still reported', () => {
    expect(relabelAccessories(['Inconnu'], after, [])).toEqual(['Inconnu']);
  });

  it('returns the same array when nothing changes', () => {
    const selected = [newLabel];
    expect(relabelAccessories(selected, after, [])).toBe(selected);
  });
});
