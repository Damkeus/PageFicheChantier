/**
 * Moteur de confiance (confidence) — PageFicheChantier.
 *
 * Calé sur le format réel de sortie AI Builder (modèle de traitement de
 * document). Le JSON contient un objet `labels` où CHAQUE champ est un objet
 * "expando" :
 *   labels: {
 *     "Tores": {
 *       "@odata.type": "#Microsoft.Dynamics.CRM.expando",
 *       "value": "Le Titulaire n'est pas en charge...",
 *       "text":  "Le Titulaire n'est pas en charge...",
 *       "displayName": "Tores",
 *       "fieldType": "string",
 *       "confidence": 0.235,
 *       "valueLocation": { ... }
 *     },
 *     "Circuit": { ... }, "Liaison": { ... }, ...
 *   }
 * et un objet `tables` pour les tableaux extraits.
 *
 * Seuils métier :
 *   confidence > 0.8            → vert   (conforme)
 *   0.5 < confidence <= 0.8     → orange (à vérifier)
 *   confidence <= 0.5 / vide    → rouge  (erreur / manquant)
 *
 * ⚠️ ADAPTER : si le schéma diffère (ex. labels imbriqués sous
 * `analyzeResult` ou `prediction`), ajuster UNIQUEMENT `extractLabels()` —
 * le reste du moteur et l'UI restent inchangés.
 */
import * as React from 'react';

// 'empty' = champ simplement non renseigné (couleur neutre, NON obligatoire),
// distinct de 'red' qui signale une extraction IA peu fiable ("pas sûr").
export type ConfidenceLevel = 'green' | 'orange' | 'red' | 'empty';

export interface ConfidenceColors {
  border: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
}

/** Palette alignée sur le Design System Nexans (cf. theme/nexansTheme.ts). */
export const CONFIDENCE_COLORS: Record<ConfidenceLevel, ConfidenceColors> = {
  green: { border: '#1F9D55', ring: 'rgba(31,157,85,0.18)', badgeBg: 'rgba(31,157,85,0.10)', badgeText: '#1F9D55' },
  orange: { border: '#E8830C', ring: 'rgba(232,131,12,0.20)', badgeBg: 'rgba(232,131,12,0.12)', badgeText: '#B45F08' },
  red: { border: '#C90016', ring: 'rgba(201,0,22,0.18)', badgeBg: 'rgba(201,0,22,0.10)', badgeText: '#C90016' },
  empty: { border: '#94A3B8', ring: 'rgba(148,163,184,0.16)', badgeBg: 'rgba(148,163,184,0.12)', badgeText: '#64748B' },
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  green: 'Sûr',
  orange: 'À vérifier',
  red: 'Pas sûr',
  empty: 'Non renseigné',
};

/** Description longue (utilisée par la card légende). */
export const CONFIDENCE_LEGEND: { level: ConfidenceLevel; title: string; desc: string }[] = [
  { level: 'green', title: 'Sûr', desc: "L'IA est confiante (> 80 %)." },
  { level: 'orange', title: 'À vérifier', desc: 'Confiance moyenne (50–80 %), relire la valeur.' },
  { level: 'red', title: 'Pas sûr', desc: "Confiance faible (< 50 %), à corriger." },
  { level: 'empty', title: 'Non renseigné', desc: 'Champ vide — non obligatoire.' },
];

/** Champ de confiance normalisé, exploitable par l'UI. */
export interface FieldConfidence {
  /** Clé brute AI Builder (avec suffixe GUID éventuel). */
  key: string;
  /** Nom lisible (displayName) — sert de clé d'appariement avec le formulaire. */
  displayName: string;
  value: string;
  confidence: number;
  level: ConfidenceLevel;
  fieldType: string;
}

interface RawExpandoField {
  value?: unknown;
  text?: string;
  displayName?: string;
  fieldType?: string;
  confidence?: number;
}

/**
 * Classe un score en niveau métier. Une valeur vide est toujours "red"
 * (champ manquant) quel que soit le score.
 */
export function confidenceLevel(score: number | undefined, isEmpty: boolean): ConfidenceLevel {
  if (isEmpty) return 'empty'; // non renseigné → couleur neutre (non obligatoire)
  if (score === undefined || Number.isNaN(score)) return 'green'; // valeur présente, pas de score IA
  if (score > 0.8) return 'green';
  if (score > 0.5) return 'orange';
  return 'red';
}

/**
 * Normalise un nom de champ pour l'appariement formulaire ↔ AI Builder :
 * minuscules, sans accents, sans suffixe GUID/hexadécimal, espaces/underscores
 * réduits. Ex. "Nombre_02bf9c05..." → "nombre", "Tores" → "tores".
 */
export function normalizeFieldName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents (diacritiques)
    .replace(/[_\s]*[0-9a-f]{16,}$/i, '') // suffixe GUID/hash AI Builder
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // ponctuation, \u00b0, (), \u20ac\u2026 \u2192 espace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Point d'adaptation : localise l'objet `labels` dans le JSON brut.
 * Couvre les emplacements usuels d'AI Builder.
 */
function extractLabels(root: Record<string, unknown>): Record<string, RawExpandoField> | null {
  const candidates: unknown[] = [
    root.labels,
    (root.analyzeResult as Record<string, unknown> | undefined)?.labels,
    (root.prediction as Record<string, unknown> | undefined)?.labels,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object') return c as Record<string, RawExpandoField>;
  }
  return null;
}

function toText(field: RawExpandoField): string {
  const v = field.value ?? field.text;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/**
 * Parse le JSON AI Builder et construit la table de confiance indexée par
 * `normalizeFieldName(displayName)`. Tolère un JSON vide/invalide (→ Map vide).
 */
export function buildConfidenceMap(json: string | undefined | null): Map<string, FieldConfidence> {
  const map = new Map<string, FieldConfidence>();
  if (!json?.trim() || json.trim() === 'val') return map;

  let root: Record<string, unknown>;
  try {
    root = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return map;
  }

  const labels = extractLabels(root);
  if (!labels) return map;

  for (const [key, raw] of Object.entries(labels)) {
    if (!raw || typeof raw !== 'object') continue;
    const displayName = raw.displayName || key;
    const value = toText(raw);
    const level = confidenceLevel(raw.confidence, value.trim() === '');
    map.set(normalizeFieldName(displayName), {
      key,
      displayName,
      value,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
      level,
      fieldType: raw.fieldType || 'string',
    });
  }
  return map;
}

/** Récupère la confiance d'un champ par n'importe lequel de ses libellés. */
export function lookupConfidence(
  map: Map<string, FieldConfidence>,
  ...labels: string[]
): FieldConfidence | undefined {
  for (const l of labels) {
    const hit = map.get(normalizeFieldName(l));
    if (hit) return hit;
  }
  return undefined;
}

/** Indique si la fiche est encore en attente de l'IA (JSON vide/null). */
export function isAwaitingAi(json: string | undefined | null): boolean {
  if (json === undefined || json === null) return true;
  const t = json.trim();
  if (t === '' || t === 'val' || t === 'null' || t === '{}' || t === '[]') return true;
  try {
    const parsed: unknown = JSON.parse(t);
    if (parsed === null) return true;
    if (typeof parsed === 'object' && Object.keys(parsed).length === 0) return true;
  } catch {
    // JSON invalide => on considère que rien n'est encore exploitable.
    return true;
  }
  return false;
}

/**
 * ============================================================================
 * TABLE DE CORRESPONDANCE — libellé du formulaire ↔ displayName(s) AI Builder
 * ============================================================================
 * Couvre l'intégralité des champs de la fiche. La clé est le libellé EXACT
 * affiché dans le formulaire ; la valeur liste les noms possibles côté
 * AI Builder (variantes, abréviations vues dans le JSON, ex. "Longueur" pour
 * "Longueur (mètre)"). Tout est normalisé au runtime (accents/ponctuation/casse
 * ignorés), donc inutile de se soucier de la casse ici.
 *
 * 👉 Pour brancher un nouveau champ extrait par l'IA : ajouter/compléter la
 * ligne correspondante. Un champ dont le libellé == displayName n'a pas besoin
 * d'alias (l'appariement direct suffit) mais reste listé pour la complétude.
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  // ── Général / CCTP (champs typiquement extraits du CCTP) ──
  'Titre du projet': ['Titre', 'Titre du projet', 'Projet', 'Title'],
  "Nature de l'opération": ['Nature operation', "Nature de l'operation", 'Operation'],
  'Budget (€)': ['Budget', 'Montant'],
  'Spécificité Projet': ['Specificite', 'Specificite projet'],
  'CCTP Ref': ['CCTP', 'CCTP Ref', 'Reference CCTP', 'Ref CCTP'],
  'Numéro Commande client': ['Numero commande', 'Commande client', 'N commande'],
  'N°Marché': ['Marche', 'Numero marche', 'N Marche'],
  'Longueur (mètre)': ['Longueur', 'Longueur metre', 'Long'],
  'Adresse Chantier': ['Adresse chantier', 'Adresse', 'Situation', 'Situatio'],
  'Nombre Liaison': ['Nombre liaison', 'Liaison', 'Nombre', 'Nb liaison'],
  'Nombre Jonction': ['Nombre jonction', 'Jonction', 'Nb jonction'],
  'Décret': ['Decret'],
  'Jonction de puissance': ['Jonction de puissance', 'Jonction puissance', 'March'],
  'Tension': ['Tension', 'Niveau de tension'],
  'Type de Malt': ['Type malt', 'Malt', 'Type de malt'],
  'tores': ['Tores', 'Tore'],
  'Circuit': ['Circuit'],
  'Extrémité Poste': ['Extremite poste', 'Extremite', 'Extr', 'Extremite poste'],
  "Phénomène d'induction": ['Phenomene induction', "Phenomene d induction", 'Ph', 'Induction'],
  'GDP': ['GDP'],
  'GMR': ['GMR'],
  'Type de Câble': ['Type cable', 'Cable', 'Configuration', 'Configur'],
  'Accessoires': ['Accessoires', 'Accessoire'],
  "Durée des travaux (semaines)": ['Duree travaux', 'Duree des travaux'],
  "Durée des essais (jours)": ['Duree essais', 'Duree des essais'],
  'Effectif max présent': ['Effectif max', 'Effectif'],
  'Horaires': ['Horaires', 'Horaire'],
  // ── Dates ──
  'Date Début Intervention': ['Date debut', 'Debut intervention', 'Date debut intervention'],
  'Date Fin Intervention': ['Date fin', 'Fin intervention', 'Date fin intervention'],
  'Date de création': ['Date creation', 'Creation'],
  'Trimestre réalisation': ['Trimestre', 'Trimestre realisation'],
  'MADU': ['MADU'],
  'Date de Consignation': ['Date consignation', 'Consignation', 'D'],
  'Date de Fin de consignation': ['Date fin consignation', 'Fin consignation'],
  // ── Client ──
  'Nom Pm Client': ['Pm client', 'Nom pm client', 'Responsable projet client'],
  'Tel Pm Client': ['Tel pm client'],
  'Mail Pm Client': ['Mail pm client', 'Email pm client'],
  'Chargé travaux Client': ['Charge travaux client'],
  'Tel Chargé de travaux Nexans': ['Tel charge travaux'],
  'Mail Chargé travaux Client': ['Mail charge travaux client'],
  'Nom Chargé étude Client': ['Charge etude client', 'Nom charge etude client'],
  'Tel Chargé étude Client': ['Tel charge etude client'],
  'Mail Chargé étude Client': ['Mail charge etude client'],
  'QHSE Client': ['QHSE client', 'QHSE'],
  'Tel QHSE Client': ['Tel qhse client'],
  'Mail QHSE Client': ['Mail qhse client'],
  'Bureau Client': ['Bureau client', 'Bureau'],
  'Contact Responsable de projet DI Client': ['Responsable projet di', 'Contact responsable projet'],
  "Contact Assistant de contrôle Client": ['Assistant controle', 'Contact assistant controle'],
  "Contact Assistant d'étude Client": ['Assistant etude', "Contact assistant etude"],
  // ── Nexans ──
  'Charge travaux Nexans': ['Charge travaux nexans', 'Charge de travaux nexans'],
  'Mail chargé Travaux Nexans': ['Mail charge travaux nexans'],
  'Adresse Nexans': ['Adresse nexans'],
  'France Sales & Installation Manager Nexans': ['Sales installation manager', 'France sales installation manager'],
  'Nom Formation Nexans': ['Formation nexans', 'Nom formation'],
  'Nom Directeur Execution de projets Nexans': ['Directeur execution', 'Nom directeur execution'],
  'Nom Ingénierie Câble Nexans': ['Ingenierie cable', 'Nom ingenierie cable'],
  'Nom Responsable logistique Chantiers Nexans': ['Responsable logistique', 'Nom responsable logistique'],
  'Nom Responsable QSHE Chantiers Nexans': ['Responsable qshe', 'Nom responsable qshe'],
  // ── PGC / 3P ──
  'PAQ/PPSPS PPE Approbateur': ['Approbateur'],
  'PAQ/PPSPS PPE Vérificateur': ['Verificateur'],
  'PAQ/PPSPS PPE Rédacteur': ['Redacteur'],
  'PAQ': ['PAQ'],
  'PPSPS': ['PPSPS'],
  'PPE': ['PPE'],
  // ── Organismes (OPPBTP / DREAL / CARSAT / Inspection / Déchet) ──
  'Adresse OPPBTP': ['Oppbtp adresse', 'Adresse oppbtp'],
  'Tel OPPBTP': ['Oppbtp tel', 'Tel oppbtp'],
  'Mail OPPBTP': ['Oppbtp mail', 'Mail oppbtp'],
  'Adresse DREAL': ['Dreal adresse', 'Adresse dreal'],
  'Tel DREAL': ['Dreal tel', 'Tel dreal'],
  'Mail DREAL': ['Dreal mail', 'Mail dreal'],
  'Adresse CARSAT': ['Carsat adresse', 'Adresse carsat'],
  'Tel Carsat': ['Carsat tel', 'Tel carsat'],
  'Mail Carsat': ['Carsat mail', 'Mail carsat'],
  'Nom Correspondant Déchet': ['Correspondant dechet', 'Nom correspondant dechet'],
  'Email Correspondant Déchet': ['Mail correspondant dechet', 'Email correspondant dechet'],
  'Adresse Base Vie': ['Base vie', 'Adresse base vie'],
  // ── Sous-traitant ──
  'Pm Sous Traitant': ['Pm sous traitant', 'Sous traitant pm'],
  'Tel Pm Sous traitant': ['Tel pm sous traitant'],
  'Mail Pm Sous Traitant': ['Mail pm sous traitant'],
  'Effectif Sous-Traitant': ['Effectif sous traitant'],
  // ── Champs génériques réutilisés dans plusieurs sections ──
  'Nom': ['Nom'],
  'Adresse': ['Adresse'],
  'Email': ['Email', 'Mail'],
  'Téléphone': ['Telephone', 'Tel'],
};

/** Index normalisé : normalize(label) → liste de displayNames normalisés. */
const ALIAS_INDEX: Map<string, string[]> = (() => {
  const idx = new Map<string, string[]>();
  for (const [label, aliases] of Object.entries(FIELD_ALIASES)) {
    idx.set(normalizeFieldName(label), aliases.map(normalizeFieldName));
  }
  return idx;
})();

// ── Contexte React : diffuse la table de confiance à tous les Input ──
export const ConfidenceContext = React.createContext<Map<string, FieldConfidence>>(new Map());

/**
 * Résout la confiance d'un champ : appariement direct sur le libellé, puis via
 * la table d'alias FIELD_ALIASES. Garantit que chaque champ du formulaire est
 * couvert par le mécanisme (même si l'IA ne l'a pas extrait → la couleur sera
 * gérée côté Input à partir de la valeur saisie).
 */
export function useFieldConfidence(label: string | undefined): FieldConfidence | undefined {
  const map = React.useContext(ConfidenceContext);
  if (!label) return undefined;
  const key = normalizeFieldName(label);
  const direct = map.get(key);
  if (direct) return direct;
  const aliases = ALIAS_INDEX.get(key);
  if (aliases) {
    for (const a of aliases) {
      const hit = map.get(a);
      if (hit) return hit;
    }
  }
  return undefined;
}
