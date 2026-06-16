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
