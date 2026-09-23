import { describe, it, expect } from 'vitest';
import { serializeCurrentSchema } from '../PageFicheChantier/schemaConstants';
import { SchemaLiaison } from '../PageFicheChantier/types';

/**
 * Contrat entre le PCF et le flux Power Automate « VerifierDossiersSchema ».
 *
 * Le flux lit l'enveloppe émise par la sortie `schemaChange` (bouton Enregistrer
 * de SchemaEditor) et en dérive une arborescence de dossiers SharePoint sous
 * `<FolderPath>/6. Tablette`. Ces tests rejouent en TypeScript les expressions
 * du flux : si le format de l'enveloppe change côté PCF, ils cassent ici plutôt
 * qu'en production.
 */

const TABLETTE = '6. Tablette';
const ILLEGAL = ['"', '*', ':', '<', '>', '?', '/', '\\', '|'];

/** Réplique de l'action `SafeLiaisonName` / `SafeElementName` du flux. */
const sanitize = (name: string): string =>
    ILLEGAL.reduce((acc, ch) => acc.split(ch).join('_'), name);

/** Réplique de `LiaisonName` : le commentaire, sinon « Liaison N ». */
const liaisonFolderName = (liaison: { comment?: string }, index: number): string =>
    (liaison.comment ?? '').trim() || `Liaison ${index + 1}`;

/** Réplique de `ElementName` : le label, sinon « Extrémité N » / « Jonction N ». */
const elementFolderName = (
    element: { type?: string; label?: string },
    index: number
): string =>
    (element.label ?? '').trim() ||
    `${element.type === 'termination' ? 'Extrémité' : 'Jonction'} ${index + 1}`;

/** Réplique de `Library` / `RelativePath` / `TablettePath` + `parameters/path`. */
function foldersCreatedByFlow(schemaJson: string, folderPath: string): string[] {
    const segments = folderPath.replace(/^\/+|\/+$/g, '').split('/');
    const relativePath = segments.slice(1).join('/');
    const tablettePath = `${relativePath}/${TABLETTE}`;

    const liaisons = JSON.parse(schemaJson).liaisons ?? [];
    const paths: string[] = [];

    liaisons.forEach((liaison: any, li: number) => {
        const elements = liaison.elements ?? [];
        if (elements.length === 0) return; // `Verifier_liaison_non_vide`
        const safeLiaison = sanitize(liaisonFolderName(liaison, li));
        paths.push(`${tablettePath}/${safeLiaison}`);
        elements.forEach((element: any, ei: number) => {
            paths.push(`${tablettePath}/${safeLiaison}/${sanitize(elementFolderName(element, ei))}`);
        });
    });

    return paths;
}

const liaison = (over: Partial<SchemaLiaison>): SchemaLiaison => ({
    id: 'l1', comment: '', ordreSchema: '', elements: [], ...over,
});

describe('contrat enveloppe schemaChange → flux VerifierDossiersSchema', () => {
    it('expose les champs que le flux lit : liaisons[].{comment,ordreSchema,elements[].{type,label}}', () => {
        const json = serializeCurrentSchema([
            liaison({
                comment: 'Départ poste A',
                elements: [
                    { id: 'e1', type: 'termination', subtype: 'simple', label: 'Ext. Nord' },
                    { id: 'e2', type: 'joint', subtype: 'malt' },
                ],
            }),
        ]);

        const envelope = JSON.parse(json);
        expect(Array.isArray(envelope.liaisons)).toBe(true);

        const [first] = envelope.liaisons;
        expect(first.comment).toBe('Départ poste A');
        expect(typeof first.ordreSchema).toBe('string');
        // Le garde-fou `AllOrdres` du flux : join(ordreSchema) non vide.
        expect(first.ordreSchema).toBe('1,5');
        expect(first.elements.map((e: any) => e.type)).toEqual(['termination', 'joint']);
        expect(first.elements[0].label).toBe('Ext. Nord');
    });

    it('déduit l’arborescence attendue sous « 6. Tablette »', () => {
        const json = serializeCurrentSchema([
            liaison({
                id: 'l1',
                comment: 'Départ poste A',
                elements: [
                    { id: 'e1', type: 'termination', subtype: 'simple', label: 'Ext. Nord' },
                    { id: 'e2', type: 'joint', subtype: 'malt' },
                ],
            }),
            liaison({ id: 'l2', comment: '', elements: [{ id: 'e3', type: 'termination' }] }),
        ]);

        expect(foldersCreatedByFlow(json, 'Documents/Chantiers/CH-001')).toEqual([
            'Chantiers/CH-001/6. Tablette/Départ poste A',
            'Chantiers/CH-001/6. Tablette/Départ poste A/Ext. Nord',
            'Chantiers/CH-001/6. Tablette/Départ poste A/Jonction 2',
            'Chantiers/CH-001/6. Tablette/Liaison 2',
            'Chantiers/CH-001/6. Tablette/Liaison 2/Extrémité 1',
        ]);
    });

    it('neutralise les caractères interdits par SharePoint dans les noms libres', () => {
        const json = serializeCurrentSchema([
            liaison({
                comment: 'Poste A/B: essai*',
                elements: [{ id: 'e1', type: 'joint', subtype: 'simple', label: 'J<1>' }],
            }),
        ]);

        const [liaisonFolder, elementFolder] = foldersCreatedByFlow(json, 'Documents/CH-002');
        expect(liaisonFolder).toBe('CH-002/6. Tablette/Poste A_B_ essai_');
        expect(elementFolder).toBe('CH-002/6. Tablette/Poste A_B_ essai_/J_1_');
    });

    it('ignore les liaisons vides — le flux ne crée alors aucun dossier', () => {
        const json = serializeCurrentSchema([liaison({ comment: 'Vide', elements: [] })]);
        expect(JSON.parse(json).liaisons[0].ordreSchema).toBe('');
        expect(foldersCreatedByFlow(json, 'Documents/CH-003')).toEqual([]);
    });
});
