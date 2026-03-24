import { SchemaElement } from './types';

/**
 * Numeric IDs for schema elements (fixed mapping)
 */
export const SCHEMA_ELEMENT_IDS = {
    // Terminations (1-3)
    't-simple': 1,          // Extrémité Simple
    't-nzo': 2,             // Extrémité ZnO
    't-droite': 3,          // Droite Directe

    // Joints (4-6)
    'j-simple': 4,          // Jonction Simple
    'j-malt': 5,            // Jonction avec Malt
    'j-arret': 6,           // Jonction avec Arrêt d'Écran
} as const;

export type SchemaToolId = keyof typeof SCHEMA_ELEMENT_IDS;

/**
 * Get numeric ID from tool ID
 */
export function getElementNumericId(toolId: string): number {
    return SCHEMA_ELEMENT_IDS[toolId as SchemaToolId] || 0;
}

/**
 * Get tool ID from numeric ID (reverse mapping)
 */
export function getToolIdFromNumeric(numId: number): SchemaToolId | null {
    const entry = Object.entries(SCHEMA_ELEMENT_IDS).find(([_, id]) => id === numId);
    return entry ? entry[0] as SchemaToolId : null;
}

/**
 * Generate OrdreSchema string from schema elements
 * Format: "1,4,5,1" - numeric IDs ordered by X position
 * Only includes elements on the baseline (Y coord close to BASELINE_Y)
 */
export function generateOrdreSchema(
    elements: SchemaElement[],
    baselineY = 300,
    tolerance = 5
): string {
    // Map element types to tool IDs
    const getToolId = (el: SchemaElement): string => {
        if (el.type === 'termination') {
            if (el.subtype === 'nzo') return 't-nzo';
            if (el.subtype === 'droite_directe') return 't-droite';
            return 't-simple';
        }
        if (el.type === 'joint') {
            if (el.subtype === 'malt') return 'j-malt';
            if (el.subtype === 'arret_ecran') return 'j-arret';
            return 'j-simple';
        }
        return '';
    };

    // Filter baseline elements and sort by X position (left to right)
    const baselineElements = elements
        .filter(el => Math.abs(el.y - baselineY) < tolerance)
        .sort((a, b) => a.x - b.x);

    // Convert to numeric IDs
    return baselineElements
        .map(el => {
            const toolId = getToolId(el);
            return getElementNumericId(toolId);
        })
        .join(',');
}

/**
 * Reconstruct elements from OrdreSchema string
 * For use in another PCF to rebuild the schema
 */
export function reconstructElementsFromOrdre(
    ordreString: string,
    baselineY = 300,
    spacing = 150
): SchemaElement[] {
    if (!ordreString) return [];

    const ids = ordreString.split(',').filter(id => id.trim() !== '');

    return ids.map((idStr, index) => {
        const numId = parseInt(idStr);
        const toolId = getToolIdFromNumeric(numId);

        if (!toolId) return null;

        // Extract type and subtype
        const [type, subtype] = toolId.split('-');

        return {
            id: `${Date.now()}_${index}`,
            type: type === 't' ? 'termination' : 'joint',
            subtype: subtype === 'simple' ? undefined : subtype,
            x: 100 + (index * spacing),
            y: baselineY,
            orientation: 'left',
        } as SchemaElement;
    }).filter(el => el !== null);
}
