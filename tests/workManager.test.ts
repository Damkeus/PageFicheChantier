import { describe, it, expect } from 'vitest';
import {
  INITIAL_DATA,
  mapProjectDataToSharePointData,
  mapSharePointDataToProjectData,
  MonteurOption,
  ProjectData,
  RawProjectData,
} from '../PageFicheChantier/types';

/**
 * Colonnes SharePoint du chargé de travaux Nexans (liste Table Fiche Chantier,
 * GUID E6F32BDB-9179-4FBD-964A-AE7392D20DB5), relevées dans les paramètres de colonne :
 *   ChargetravauxNexans           → lookup « Charge travaux Nexans »
 *   field_60                      → « Tel Chargé de travaux Nexans »
 *   Mailcharg_x00e9_TravauxNexans → « Mail chargé Travaux Nexans »
 * field_62 appartient au « Tel Technicien support projet Nexans » : l'y écrire écrasait
 * le contact d'une autre personne.
 */
const data = (over: Partial<ProjectData>): ProjectData => ({ ...INITIAL_DATA, ...over });

describe('chargé de travaux Nexans — colonnes', () => {
  it('écrit le téléphone dans field_60, jamais dans field_62', () => {
    const raw = mapProjectDataToSharePointData(data({ workManagerPhone: '06 12 34 56 78' }));
    expect(raw.field_60).toBe('06 12 34 56 78');
    expect(raw.field_62).not.toBe('06 12 34 56 78');
  });

  it('relit le téléphone depuis field_60', () => {
    const projet = mapSharePointDataToProjectData({ field_60: '06 12 34 56 78' } as RawProjectData);
    expect(projet.workManagerPhone).toBe('06 12 34 56 78');
  });

  it('fait un aller-retour complet sur les trois champs', () => {
    const raw = mapProjectDataToSharePointData(
      data({
        workManagerName: 'Jean DUPONT',
        workManagerId: 42,
        workManagerPhone: '06 12 34 56 78',
        workManagerEmail: 'jean.dupont@nexans.com',
      }),
    );
    const relu = mapSharePointDataToProjectData(raw as RawProjectData);
    expect(relu.workManagerName).toBe('Jean DUPONT');
    expect(relu.workManagerId).toBe(42);
    expect(relu.workManagerPhone).toBe('06 12 34 56 78');
    expect(relu.workManagerEmail).toBe('jean.dupont@nexans.com');
  });
});

describe('chargé de travaux Nexans — lookup', () => {
  it("émet l'ID du monteur sélectionné", () => {
    const raw = mapProjectDataToSharePointData(
      data({ workManagerName: 'Jean DUPONT', workManagerId: 42 }),
    );
    expect(raw.ChargetravauxNexans).toEqual({
      '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference',
      Id: 42,
      Value: 'Jean DUPONT',
    });
  });

  it('MonteurOption porte un ID exploitable', () => {
    // Sans ID sur l'option, le sélecteur ne peut pas alimenter workManagerId : le lookup
    // partait alors avec Id 0 et SharePoint n'enregistrait rien.
    const monteur: MonteurOption = { ID: 42, Title: 'Jean DUPONT', field_1: '06', field_2: 'j@d.com' };
    expect(monteur.ID ?? monteur.Id ?? 0).toBe(42);
  });
});
