/**
 * Fusion CCTP (IA) ↔ SharePoint — PageFicheChantier.
 *
 * Règle d'or (source de vérité) : **les données SharePoint priment toujours**.
 * Pour chaque champ mappé :
 *   1. SharePoint a une valeur valide  → on la garde, niveau 'green' forcé
 *      (déjà validé/sécurisé).
 *   2. SharePoint vide                 → fallback sur la valeur extraite du
 *      JSON AI Builder (Input_CCTPJson) + couleur selon le confidence score.
 *   3. Aucune des deux                 → champ laissé vide (couleur neutre côté
 *      Input).
 *
 * Le moteur de confiance (seuils, parsing labels, normalisation) vit dans
 * `confidence.ts`. Ici on ne fait QUE le croisement avec le modèle métier
 * `ProjectData`. Les valeurs IA sont du texte libre (phrases) : on les injecte
 * telles quelles, l'utilisateur les corrige (→ vert).
 */
import { ProjectData } from './types';
import {
  ConfidenceLevel,
  buildConfidenceMap,
  confidenceLevel,
  lookupConfidence,
  normalizeFieldName,
  isBlankValue,
} from './confidence';

/**
 * Table de correspondance des champs réellement extraits par l'IA aujourd'hui
 * (13 labels, tous `fieldType:"string"`). Source unique de vérité reliant :
 *   - `key`     : clé du modèle `ProjectData` (State React),
 *   - `label`   : libellé EXACT affiché dans le formulaire (sert de clé couleur),
 *   - `aiNames` : displayName(s) possibles côté AI Builder (normalisés au runtime).
 *
 * 👉 Pour brancher un nouveau champ IA : ajouter une ligne ici. Rien d'autre.
 */
export interface AiFieldLink {
  key: keyof ProjectData;
  label: string;
  aiNames: string[];
}

export const AI_FIELD_MAP: AiFieldLink[] = [
  { key: 'contractNumber', label: 'N°Marché', aiNames: ['Marché cadre'] },
  { key: 'nombreLiaison', label: 'Nombre Liaison', aiNames: ['Liaison'] },
  { key: 'tores', label: 'tores', aiNames: ['Tores'] },
  { key: 'typeMalt', label: 'Type de Malt', aiNames: ['Type de MALT'] },
  { key: 'siteAddress', label: 'Adresse Chantier', aiNames: ['Situation des Travaux'] },
  { key: 'circuit', label: 'Circuit', aiNames: ['Circuit'] },
  { key: 'gdp', label: 'GDP', aiNames: ['GDP'] },
  { key: 'length', label: 'Longueur (mètre)', aiNames: ['Longueur Travaux'] },
  { key: 'extremitePoste', label: 'Extrémité Poste', aiNames: ['Extrémité Poste'] },
  { key: 'jonctionPuissance', label: 'Jonction de puissance', aiNames: ['Nombre Jonction Puissance'] },
  { key: 'gmr', label: 'GMR', aiNames: ['GMR'] },
  { key: 'phenomeneInduction', label: "Phénomène d'induction", aiNames: ["Phénomène d'Induction"] },
  { key: 'decret', label: 'Décret', aiNames: ['Décret Poste'] },
];

/** Clés ProjectData pilotées par l'IA (pour le garde-fou anti-clobber côté App). */
export const AI_FIELD_KEYS: readonly (keyof ProjectData)[] = AI_FIELD_MAP.map((f) => f.key);

export interface MergeResult {
  /** Données fusionnées prêtes à initialiser/mettre à jour le State. */
  data: ProjectData;
  /** Niveau de couleur par champ, indexé par normalizeFieldName(label). */
  levels: Map<string, ConfidenceLevel>;
}

/**
 * Croise les données SharePoint (`spData`) avec le JSON AI Builder (`cctpJson`)
 * en appliquant la règle d'or. Ne mute jamais `spData` (copie immuable).
 */
export function mergeCctpIntoData(spData: ProjectData, cctpJson?: string | null): MergeResult {
  const conf = buildConfidenceMap(cctpJson);
  const data: ProjectData = { ...spData };
  const levels = new Map<string, ConfidenceLevel>();

  for (const { key, label, aiNames } of AI_FIELD_MAP) {
    const nLabel = normalizeFieldName(label);
    const spValue = spData[key];

    // 1. SharePoint prime → valeur conservée, vert forcé (sécurisé/validé).
    if (!isBlankValue(spValue, { zeroIsBlank: true })) {
      levels.set(nLabel, 'green');
      continue;
    }

    // 2. SharePoint vide → fallback IA + couleur de confiance.
    const hit = lookupConfidence(conf, ...aiNames);
    if (hit && hit.value.trim() !== '') {
      // Les 13 champs mappés sont tous de type string.
      (data as unknown as Record<string, unknown>)[key as string] = hit.value;
      levels.set(nLabel, confidenceLevel(hit.confidence, false));
    }
    // 3. Sinon : champ laissé vide, pas de niveau (Input neutre).
  }

  return { data, levels };
}
