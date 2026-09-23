import {
    SchemaElement,
    SchemaLiaison,
    PersistedSchemaElement,
    PersistedCurrentSchema,
} from './types';

// v1 → v2: elements lost their x/y. Order is now carried by the array itself.
export const CURRENT_SCHEMA_VERSION = 2;

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
 * Map an element to its palette tool id.
 */
function getToolIdForElement(el: SchemaElement): string {
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
}

/**
 * Generate the OrdreSchema string from a liaison's elements.
 * Format: "1,4,5,1" — numeric type codes, in `elements` array order.
 *
 * The array order IS the left-to-right order: there is nothing to sort and no
 * geometry to inspect. A previous version filtered on a hardcoded baseline
 * (y ≈ 300 ± 5), which silently emptied the ordre of every liaison not drawn
 * on that exact line — i.e. all but one in a multi-liaison schema.
 */
export function generateOrdreSchema(elements: SchemaElement[]): string {
    return elements
        .map(el => getElementNumericId(getToolIdForElement(el)))
        .filter(code => code > 0)
        .join(',');
}

/**
 * Reconstruct elements from an OrdreSchema CSV ("1,4,5,1").
 * Legacy path only — the CSV carries no labels and no orientation, so this is
 * lossy. Used when a record predates the v2 envelope.
 */
export function reconstructElementsFromOrdre(ordreString: string): SchemaElement[] {
    if (!ordreString) return [];

    return ordreString
        .split(',')
        .filter(id => id.trim() !== '')
        .map((idStr, index) => {
            const toolId = getToolIdFromNumeric(parseInt(idStr, 10));
            if (!toolId) return null;

            const [type, subtype] = toolId.split('-');

            return {
                id: generateElementId(index),
                type: type === 't' ? 'termination' : 'joint',
                subtype: subtype === 'simple' ? undefined : subtype,
                orientation: 'left',
            } as SchemaElement;
        })
        .filter((el): el is SchemaElement => el !== null);
}

/**
 * Generate a stable-ish unique id for a new liaison.
 */
export function generateLiaisonId(): string {
    return `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique id for a schema element. The `seed` keeps ids distinct
 * when several elements are recreated in the same millisecond (on load).
 */
export function generateElementId(seed = 0): string {
    return `${Date.now()}_${seed}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Drop the runtime-only `id` while keeping every persisted field (orientation
 * included). Undefined fields are omitted by JSON.stringify.
 */
function stripElementId(el: SchemaElement): PersistedSchemaElement {
    return {
        type: el.type,
        subtype: el.subtype,
        orientation: el.orientation,
        hasZ: el.hasZ,
        label: el.label,
    };
}

/**
 * Serialize liaisons into the `currentSchema` JSON envelope.
 * Recomputes each liaison's ordreSchema from its elements so it stays in sync.
 * The runtime-only `id` (liaison + elements) is stripped — it is regenerated
 * on load by parseCurrentSchema.
 */
export function serializeCurrentSchema(liaisons: SchemaLiaison[]): string {
    const payload: PersistedCurrentSchema = {
        version: CURRENT_SCHEMA_VERSION,
        liaisons: liaisons.map(l => ({
            comment: l.comment || '',
            ordreSchema: generateOrdreSchema(l.elements || []),
            elements: (l.elements || []).map(stripElementId),
        })),
    };
    return JSON.stringify(payload);
}

/**
 * Parse the `currentSchema` JSON envelope into a liaison array.
 * Robust: invalid/empty input returns [].
 * Optional legacy migration: if currentSchema is empty but a legacy
 * schemaData/ordreSchema exists, wrap it into a single liaison.
 */
export function parseCurrentSchema(
    json: string,
    legacy?: { schemaData?: string; ordreSchema?: string }
): SchemaLiaison[] {
    const fromCurrent = parseCurrentSchemaRaw(json);
    if (fromCurrent.length > 0) return fromCurrent;

    // Legacy migration fallback
    if (legacy && (legacy.schemaData || legacy.ordreSchema)) {
        let elements: SchemaElement[] = [];
        if (legacy.schemaData) {
            try {
                const parsed = JSON.parse(legacy.schemaData);
                if (Array.isArray(parsed)) elements = parsed as SchemaElement[];
            } catch {
                elements = [];
            }
        }
        if (elements.length === 0 && legacy.ordreSchema) {
            elements = reconstructElementsFromOrdre(legacy.ordreSchema);
        }
        if (elements.length > 0) {
            return [{
                id: generateLiaisonId(),
                comment: '',
                ordreSchema: generateOrdreSchema(elements),
                elements,
            }];
        }
    }

    return [];
}

/** A v1 element still carries coordinates; v2 does not. */
type RawElement = SchemaElement & { x?: unknown; y?: unknown };

/**
 * Normalize a liaison's elements to v2: ordered array, no coordinates.
 *
 * v1 stored the order implicitly in the geometry, so sort by x before dropping
 * the coordinates. v2 has no x — the array order already is the truth and must
 * be preserved untouched.
 */
function orderAndStripPositions(rawElements: RawElement[]): SchemaElement[] {
    const isV1 = rawElements.length > 0 && rawElements.every(el => typeof el.x === 'number');
    const ordered = isV1
        ? [...rawElements].sort((a, b) => (a.x as number) - (b.x as number))
        : rawElements;

    // Regenerate the runtime-only id when missing (it is stripped on save).
    return ordered.map((el, i): SchemaElement => ({
        id: typeof el.id === 'string' && el.id ? el.id : generateElementId(i),
        type: el.type,
        subtype: el.subtype,
        orientation: el.orientation,
        hasZ: el.hasZ,
        label: el.label,
    }));
}

function parseCurrentSchemaRaw(json: string): SchemaLiaison[] {
    if (!json?.trim()) return [];
    try {
        const parsed = JSON.parse(json);
        const liaisons = Array.isArray(parsed) ? parsed : parsed?.liaisons;
        if (!Array.isArray(liaisons)) return [];
        return liaisons
            .filter((l: unknown): l is Record<string, unknown> => !!l && typeof l === 'object')
            .map((l): SchemaLiaison => {
                const elements = orderAndStripPositions(
                    Array.isArray(l.elements) ? (l.elements as RawElement[]) : []
                );
                return {
                    id: typeof l.id === 'string' && l.id ? l.id : generateLiaisonId(),
                    comment: typeof l.comment === 'string' ? l.comment : '',
                    // Always derived, never trusted from storage: v1 records were
                    // written by the buggy baseline filter and may hold "".
                    ordreSchema: generateOrdreSchema(elements),
                    elements,
                };
            });
    } catch {
        return [];
    }
}
