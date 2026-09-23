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

import { seedRows } from '../PageFicheChantier/tables';

describe('seedRows', () => {
  it('copie les lignes IA quand il y en a', () => {
    const grid = { key: 'k', columns: ['A', 'B'], rows: [{ A: 'x', B: 'y' }], levels: [] };
    const seeded = seedRows(grid);
    expect(seeded).toEqual([{ A: 'x', B: 'y' }]);
    expect(seeded[0]).not.toBe(grid.rows[0]); // copie, pas la même référence
  });

  it('amorce une ligne blanche quand l’IA n’a rien extrait', () => {
    const grid = { key: 'k', columns: ['A', 'B'], rows: [], levels: [] };
    expect(seedRows(grid)).toEqual([{ A: '', B: '' }]);
  });
});

import {
  parseSavedTables,
  hasSavedRows,
  seedRowsFromSaved,
  seedSectionFromSaved,
} from '../PageFicheChantier/tables';

const EXTERNES_DEF = SECTION_DEFS[0];
const EXTERNES_GRID = EXTERNES_DEF.grids[0];

const SAVED_SECTION = {
  grids: [
    {
      key: 'externes',
      columns: ['Nom', 'Mail', 'N° Téléphone', 'Fonction'],
      rows: [
        { Nom: 'LEMAITRE Julien', Mail: 'j@omexom.com', 'N° Téléphone': '06 18', Fonction: 'BE' },
        { Nom: 'jeanne lecordu', Mail: 'jeanne.lecordu@gmail.com', 'N° Téléphone': '', Fonction: 'Société DEKRA' },
      ],
    },
  ],
};

describe('parseSavedTables', () => {
  it('accepte le double encodage produit par JSON({externes: ThisItem.Col})', () => {
    const json = JSON.stringify({ externes: JSON.stringify(SAVED_SECTION) });
    const saved = parseSavedTables(json);
    expect(saved.externes?.[0].rows).toHaveLength(2);
    expect(saved.externes?.[0].rows[1].Nom).toBe('jeanne lecordu');
  });

  it('accepte les objets déjà décodés', () => {
    const saved = parseSavedTables(JSON.stringify({ externes: SAVED_SECTION }));
    expect(saved.externes?.[0].rows[1].Nom).toBe('jeanne lecordu');
  });

  it('accepte les clés outputKey du manifest', () => {
    const saved = parseSavedTables(JSON.stringify({ cctpInterlocuteursExternes: SAVED_SECTION }));
    expect(saved.externes?.[0].rows).toHaveLength(2);
  });

  it('ignore les clés inconnues, les valeurs vides et le JSON invalide', () => {
    expect(parseSavedTables(JSON.stringify({ inconnue: SAVED_SECTION })).externes).toBeUndefined();
    expect(parseSavedTables(JSON.stringify({ externes: '' })).externes).toBeUndefined();
    expect(parseSavedTables(JSON.stringify({ externes: 'pas du json' })).externes).toBeUndefined();
    expect(parseSavedTables(JSON.stringify({ externes: { pasDeGrids: 1 } })).externes).toBeUndefined();
    for (const input of ['', '   ', 'not json', undefined, null]) {
      expect(parseSavedTables(input as string)).toEqual({});
    }
  });
});

describe('hasSavedRows', () => {
  it('vrai dès qu’une cellule est renseignée', () => {
    expect(hasSavedRows(SAVED_SECTION.grids)).toBe(true);
  });

  it('faux sur des lignes blanches, une section vide ou absente', () => {
    expect(hasSavedRows([{ key: 'k', columns: ['A'], rows: [{ A: '' }, { A: '   ' }] }])).toBe(false);
    expect(hasSavedRows([{ key: 'k', columns: ['A'], rows: [] }])).toBe(false);
    expect(hasSavedRows(undefined)).toBe(false);
  });
});

describe('seedRowsFromSaved', () => {
  it('normalise sur les colonnes courantes et écarte les lignes vides', () => {
    const rows = seedRowsFromSaved(EXTERNES_GRID, {
      key: 'externes',
      columns: ['nom', 'MAIL', 'Colonne supprimée'],
      rows: [
        { nom: 'jeanne lecordu', MAIL: 'j@x.fr', 'Colonne supprimée': 'ignorée' },
        { nom: '', MAIL: '' },
      ],
    });
    expect(rows).toEqual([
      { Nom: 'jeanne lecordu', Mail: 'j@x.fr', 'N° Téléphone': '', Fonction: '' },
    ]);
  });

  it('rend une ligne blanche quand l’enregistrement est vide ou absent', () => {
    expect(seedRowsFromSaved(EXTERNES_GRID)).toEqual([
      { Nom: '', Mail: '', 'N° Téléphone': '', Fonction: '' },
    ]);
  });
});

describe('seedSectionFromSaved', () => {
  it('apparie les grilles par clé, puis par index en secours', () => {
    const redaction = SECTION_DEFS.find((s) => s.id === 'redaction')!;
    const seeded = seedSectionFromSaved(redaction, [
      { key: 'indice', columns: ['Date', 'Indice', 'Evolution'], rows: [{ Date: '2025-01-28', Indice: '1', Evolution: 'Init' }] },
      { key: 'redaction', columns: ['Rédacteur'], rows: [{ 'Rédacteur': 'T. PAQUIER' }] },
    ]);
    expect(seeded[0][0]['Rédacteur']).toBe('T. PAQUIER'); // grille 'redaction' retrouvée par clé
    expect(seeded[1][0].Evolution).toBe('Init');
  });
});
