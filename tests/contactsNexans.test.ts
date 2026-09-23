import { describe, it, expect } from 'vitest';
import {
  INITIAL_DATA,
  mapProjectDataToSharePointData,
  mapSharePointDataToProjectData,
  ProjectData,
  RawProjectData,
} from '../PageFicheChantier/types';

/**
 * Colonnes « contacts Nexans » de la Table Fiche Chantier, confirmées par l'utilisateur :
 *   field_61 = Nom Technicien support projet Nexans
 *   field_62 = Tel Technicien support projet Nexans
 *   field_71 = Nom Médecin du travail Nexans
 *   field_72 = Tel Médecin du travail Nexans
 *   field_73 = Nom Formation Nexans
 *   field_74 = Tel Formation Nexans
 *
 * Le PCF les avait décalées : « Formation » écrivait dans le technicien support, et
 * un couple `infirmier` sans colonne ni UI squattait les colonnes Formation.
 */
const data = (over: Partial<ProjectData>): ProjectData => ({ ...INITIAL_DATA, ...over });

describe('contacts Nexans — Formation', () => {
  it('écrit le nom dans field_73', () => {
    expect(mapProjectDataToSharePointData(data({ trainingName: 'Centre AFPA' })).field_73)
      .toBe('Centre AFPA');
  });

  it('écrit le téléphone dans field_74', () => {
    expect(mapProjectDataToSharePointData(data({ trainingPhone: '04 11 22 33 44' })).field_74)
      .toBe('04 11 22 33 44');
  });

  it('fait un aller-retour', () => {
    const raw = mapProjectDataToSharePointData(
      data({ trainingName: 'Centre AFPA', trainingPhone: '04 11 22 33 44' }),
    );
    const relu = mapSharePointDataToProjectData(raw as RawProjectData);
    expect(relu.trainingName).toBe('Centre AFPA');
    expect(relu.trainingPhone).toBe('04 11 22 33 44');
  });
});

describe('contacts Nexans — Médecin du travail', () => {
  it('reste sur field_71 / field_72', () => {
    const raw = mapProjectDataToSharePointData(
      data({ medecin: 'Dr HOUSE', medecinPhone: '04 55 66 77 88' }),
    );
    expect(raw.field_71).toBe('Dr HOUSE');
    expect(raw.field_72).toBe('04 55 66 77 88');
    const relu = mapSharePointDataToProjectData(raw as RawProjectData);
    expect(relu.medecin).toBe('Dr HOUSE');
    expect(relu.medecinPhone).toBe('04 55 66 77 88');
  });

  it('ne partage plus field_72 avec le téléphone Formation', () => {
    const raw = mapProjectDataToSharePointData(
      data({ medecinPhone: '04 55 66 77 88', trainingPhone: '04 11 22 33 44' }),
    );
    expect(raw.field_72).toBe('04 55 66 77 88');
    expect(raw.field_74).toBe('04 11 22 33 44');
  });
});

describe('contacts Nexans — Technicien support', () => {
  it("n'est plus écrasé par un autre contact", () => {
    // Le PCF n'édite pas ce contact : ses colonnes doivent rester absentes du mapping,
    // pour que le spread de rawSharePointData dans handleSave conserve leur valeur.
    const raw = mapProjectDataToSharePointData(
      data({ trainingName: 'Centre AFPA', trainingPhone: '04 11 22 33 44', workManagerPhone: '06 00 00 00 00' }),
    );
    expect(raw.field_61).toBeUndefined();
    expect(raw.field_62).toBeUndefined();
  });
});
