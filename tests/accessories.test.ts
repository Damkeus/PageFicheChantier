import { describe, it, expect } from 'vitest';
import {
  AccessoryOption,
  accessoryId,
  buildAccessoryLabels,
  parseListAccessoire,
  resolveAccessories,
  serializeListAccessoire,
} from '../PageFicheChantier/accessories';

// Extrait réel de `JSON(First(colAccessoires))` (liste "Table Accessoires", GUID 7d40fccd…).
// field_2 = Code SAP, field_3 = Désignation Suisse, field_5 = Description Nexans France,
// field_10 = Section, field_11 = Tension.
const EXTREMITE_630_AL: AccessoryOption = {
  ID: 266,
  Title: 'Extrémité extérieure',
  Ame: 'Al',
  field_2: '10563124',
  field_3: 'FM1.100, 100kV, 1x 630mm2 Al',
  field_5: 'Extrémité 90 kV extérieure synthétique autoporteuse - 630 mm²',
  field_10: '630',
  field_11: '90',
};

// Les 5 « Support autoporteur » : même description, seuls Section et Ame varient.
const supports: AccessoryOption[] = [
  { ID: 301, Title: 'Support autoporteur', Ame: 'Al', field_2: '10526802', field_5: 'Système auto-porteur pour extrémités 90 kV', field_10: '630', field_11: '90' },
  { ID: 302, Title: 'Support autoporteur', Ame: 'Al', field_2: '10526803', field_5: 'Système auto-porteur pour extrémités 90 kV', field_10: '1200', field_11: '90' },
  { ID: 303, Title: 'Support autoporteur', Ame: 'Cu', field_2: '10526805', field_5: 'Système auto-porteur pour extrémités 90 kV', field_10: '1200', field_11: '90' },
  { ID: 304, Title: 'Support autoporteur', Ame: 'Al', field_2: '10526804', field_5: 'Système auto-porteur pour extrémités 90 kV', field_10: '1600', field_11: '90' },
  { ID: 305, Title: 'Support autoporteur', Ame: 'Cu', field_2: '10526806', field_5: 'Système auto-porteur pour extrémités 90 kV', field_10: '1600', field_11: '90' },
];

describe('accessoryId', () => {
  it('accepte ID ou Id', () => {
    expect(accessoryId({ ID: 266, Title: 'x' })).toBe(266);
    expect(accessoryId({ Id: 42, Title: 'x' })).toBe(42);
    expect(accessoryId({ Title: 'x' })).toBeUndefined();
  });
});

describe('buildAccessoryLabels', () => {
  it('affiche toujours Title, description, section, tension et âme', () => {
    expect(buildAccessoryLabels([EXTREMITE_630_AL])).toEqual([
      'Extrémité extérieure — Extrémité 90 kV extérieure synthétique autoporteuse - 630 mm² · 630 mm² · 90 kV · Al',
    ]);
  });

  it('distingue 5 lignes qui ne diffèrent que par la section et l’âme', () => {
    // C'est le bug observé : 5 lignes distinctes ne produisaient que 2 libellés.
    const labels = buildAccessoryLabels(supports);
    expect(new Set(labels).size).toBe(5);
    expect(labels[0]).toContain('630 mm²');
    expect(labels[1]).toContain('1200 mm²');
    expect(labels[2]).toContain('Cu');
    expect(labels.every((l) => l.startsWith('Support autoporteur —'))).toBe(true);
    expect(labels.every((l) => l.includes('90 kV'))).toBe(true);
  });

  it('affiche la tension, qui seule sépare le 225 kV du 400 kV', () => {
    // Cas réel : deux « Extrémité composite » 2500 mm² dont seule la tension diffère.
    const labels = buildAccessoryLabels([
      { ID: 10, Title: 'Extrémité composite', Ame: 'Cu', field_5: 'Extrémité 225 kV extérieure composite huile - 2500 mm', field_10: '2500', field_11: '225' },
      { ID: 11, Title: 'Extrémité composite', Ame: 'Cu', field_5: 'Extrémité 225 kV extérieure composite huile - 2500 mm', field_10: '2500', field_11: '400' },
    ]);
    expect(labels[0]).toContain('225 kV');
    expect(labels[1]).toContain('400 kV');
    expect(new Set(labels).size).toBe(2);
  });

  it('tombe sur le code SAP quand tout le reste est identique', () => {
    const jumeaux: AccessoryOption[] = [
      { ID: 1, Title: 'T', Ame: 'Al', field_2: '111', field_5: 'Même description', field_10: '630', field_11: '90' },
      { ID: 2, Title: 'T', Ame: 'Al', field_2: '222', field_5: 'Même description', field_10: '630', field_11: '90' },
    ];
    const labels = buildAccessoryLabels(jumeaux);
    expect(new Set(labels).size).toBe(2);
    expect(labels[0]).toContain('111');
    expect(labels[1]).toContain('222');
  });

  it("retombe sur Title quand la description est absente", () => {
    expect(buildAccessoryLabels([{ ID: 9, Title: 'Extrémité extérieure' }])).toEqual(['Extrémité extérieure']);
  });

  it('produit toujours autant de libellés que d’options', () => {
    expect(buildAccessoryLabels([...supports, EXTREMITE_630_AL])).toHaveLength(6);
  });
});

describe('parseListAccessoire', () => {
  it('lit le JSON réel de la fiche de test du 21/07', () => {
    const raw =
      '[{"id":-1,"value":"Extrémité 90 kV intérieure synthétique non-autoporteuse - 1200 mm²","quantity":1},' +
      '{"id":-1,"value":"Jonction normale prémoulé sans MALT - 1200mm²","quantity":1}]';
    expect(parseListAccessoire(raw)).toEqual([
      { id: -1, value: 'Extrémité 90 kV intérieure synthétique non-autoporteuse - 1200 mm²', quantity: 1 },
      { id: -1, value: 'Jonction normale prémoulé sans MALT - 1200mm²', quantity: 1 },
    ]);
  });

  it('ne jette pas sur une entrée vide, absente ou malformée', () => {
    expect(parseListAccessoire('')).toEqual([]);
    expect(parseListAccessoire(undefined)).toEqual([]);
    expect(parseListAccessoire('pas du json')).toEqual([]);
    expect(parseListAccessoire('{"a":1}')).toEqual([]);
  });

  it('complète les champs manquants', () => {
    expect(parseListAccessoire('[{"value":"X"}]')).toEqual([{ id: -1, value: 'X', quantity: 1 }]);
  });
});

describe('resolveAccessories', () => {
  const labels = buildAccessoryLabels(supports);

  it('résout un libellé courant vers son ID', () => {
    const out = resolveAccessories([labels[3]], supports, []);
    expect(out.unresolved).toEqual([]);
    expect(out.resolved).toEqual([{ id: 304, label: labels[3], quantity: 1 }]);
  });

  it('agrège les doublons en quantité', () => {
    const out = resolveAccessories([labels[0], labels[0], labels[1]], supports, []);
    expect(out.resolved).toEqual([
      { id: 301, label: labels[0], quantity: 2 },
      { id: 302, label: labels[1], quantity: 1 },
    ]);
  });

  it('ne fusionne plus deux sections différentes sous un même libellé', () => {
    // Avant : les 3 « - Al » devenaient une entrée quantity 3 avec l'ID du 630 mm².
    const out = resolveAccessories([labels[0], labels[1], labels[3]], supports, []);
    expect(out.resolved.map((r) => r.id)).toEqual([301, 302, 304]);
    expect(out.resolved.every((r) => r.quantity === 1)).toBe(true);
  });

  it('tolère les écarts d’espaces et de casse', () => {
    const bruite = labels[0].toUpperCase().replace(/ /g, '  ');
    expect(resolveAccessories([bruite], supports, []).resolved.map((r) => r.id)).toEqual([301]);
  });

  it('rattache un libellé au format précédent « description - âme »', () => {
    // Format produit par le mapper d'avant le 2026-08-21.
    const out = resolveAccessories(
      ['Système auto-porteur pour extrémités 90 kV - Al'],
      [supports[0]],
      [],
    );
    expect(out.resolved.map((r) => r.id)).toEqual([301]);
    expect(out.resolved[0].label).toBe(labels[0]);
  });

  it("récupère l'ID mémorisé quand le libellé a changé depuis la sauvegarde", () => {
    const previous = [{ id: 304, value: 'ancien libellé qui ne matche plus', quantity: 1 }];
    const out = resolveAccessories(['ancien libellé qui ne matche plus'], supports, previous);
    expect(out.unresolved).toEqual([]);
    expect(out.resolved).toEqual([{ id: 304, label: labels[3], quantity: 1 }]);
  });

  it('ignore un ID mémorisé qui n’existe plus dans le référentiel', () => {
    const previous = [{ id: 99999, value: 'accessoire supprimé', quantity: 1 }];
    const out = resolveAccessories(['accessoire supprimé'], supports, previous);
    expect(out.resolved).toEqual([]);
    expect(out.unresolved).toEqual(['accessoire supprimé']);
  });

  it('résout un libellé hérité « description seule » quand un seul candidat correspond', () => {
    const out = resolveAccessories(
      ['Extrémité 90 kV extérieure synthétique autoporteuse - 630 mm²'],
      [EXTREMITE_630_AL],
      [],
    );
    expect(out.resolved.map((r) => r.id)).toEqual([266]);
  });

  it('refuse de deviner quand un libellé hérité correspond à plusieurs candidats', () => {
    // « … - 1200 mm² » sans l'âme : Al et Cu correspondent tous les deux. Choisir au hasard
    // enverrait le mauvais ID au flux, donc on laisse l'utilisateur re-sélectionner.
    const out = resolveAccessories(['Système auto-porteur pour extrémités 90 kV'], supports, []);
    expect(out.resolved).toEqual([]);
    expect(out.unresolved).toEqual(['Système auto-porteur pour extrémités 90 kV']);
  });

  it('remonte les non-résolus au lieu de les jeter en silence', () => {
    // Exactement le cas du 21/07 : 3 libellés hérités, aucun ID, colonne Accessoire vidée.
    const out = resolveAccessories(['inconnu A', 'inconnu B'], supports, []);
    expect(out.resolved).toEqual([]);
    expect(out.unresolved).toEqual(['inconnu A', 'inconnu B']);
  });
});

describe('serializeListAccessoire', () => {
  it('fait un aller-retour stable', () => {
    const entries = [{ id: 301, value: 'A', quantity: 2 }];
    expect(parseListAccessoire(serializeListAccessoire(entries))).toEqual(entries);
  });

  it('écrit des ID réels, plus jamais -1, pour les entrées résolues', () => {
    const labels = buildAccessoryLabels(supports);
    const { resolved } = resolveAccessories([labels[0], labels[0]], supports, []);
    const json = serializeListAccessoire(resolved.map((r) => ({ id: r.id, value: r.label, quantity: r.quantity })));
    expect(json).not.toContain('"id":-1');
    expect(parseListAccessoire(json)[0].quantity).toBe(2);
  });
});
