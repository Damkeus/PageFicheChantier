/**
 * Sélection des accessoires : libellés et résolution d'identité.
 *
 * Historique du bug : l'identité d'un accessoire était son *libellé*. La sauvegarde
 * re-matchait ce libellé contre le référentiel pour retrouver l'ID, puis
 * `.filter(a => a.Id !== -1)` jetait silencieusement tout ce qui ne re-matchait pas —
 * ce qui vidait la colonne SharePoint `Accessoire` et faisait sortir le tableau
 * accessoires du PAQ complètement vide, sans la moindre erreur.
 *
 * Ici l'ID redevient l'identité : il est mémorisé dans `ListAccessoire`, réutilisé quand
 * le libellé a bougé, et ce qui reste irrésolu est *remonté* au lieu d'être supprimé.
 *
 * Noms de colonnes de la liste "Table Accessoires" tels que Power Apps les sérialise :
 *   field_2 = Code SAP · field_3 = Désignation Suisse · field_5 = Description Nexans France
 *   field_10 = Section (mm²) · field_11 = Tension (kV)
 * Power Apps omet les colonnes vides, d'où les `?` partout.
 */

export interface AccessoryOption {
  ID?: number;
  Id?: number;
  Title: string;
  Ame?: string;
  field_2?: string;
  field_3?: string;
  field_5?: string;
  field_10?: string;
  field_11?: string;
}

/** Une entrée de la colonne texte `ListAccessoire` (JSON). */
export interface ListAccessoireEntry {
  id: number;
  value: string;
  quantity: number;
}

export interface ResolvedAccessory {
  id: number;
  label: string;
  quantity: number;
}

export interface AccessoryResolution {
  resolved: ResolvedAccessory[];
  /** Libellés qu'on n'a pas su rattacher au référentiel — à signaler, jamais à jeter. */
  unresolved: string[];
}

/** SharePoint renvoie tantôt `ID`, tantôt `Id` selon le chemin d'accès. */
export const accessoryId = (opt: AccessoryOption): number | undefined => opt.ID ?? opt.Id;

/**
 * Clé de comparaison tolérante : casse et espaces ignorés. `\s` couvre aussi les espaces
 * insécables et fines que SharePoint glisse dans les descriptions (« 1 200 mm² »).
 */
const normalize = (label: string): string => label.toLowerCase().replace(/\s+/g, '');

/**
 * Libellé affiché dans le sélecteur : type, description, section, tension, âme.
 *
 * Tout est affiché systématiquement, y compris ce que la description répète parfois : la
 * section et la tension ne sont pas toujours dans le texte (« Système auto-porteur pour
 * extrémités 90 kV » couvre 630/1200/1600 mm²) et la tension seule sépare deux extrémités
 * composites 2500 mm² identiques en 225 kV et 400 kV.
 */
const baseLabel = (opt: AccessoryOption): string => {
  const head = [opt.Title, opt.field_5].filter(Boolean).join(' — ');
  const specs = [
    opt.field_10 && `${opt.field_10} mm²`,
    opt.field_11 && `${opt.field_11} kV`,
    opt.Ame,
  ].filter(Boolean);
  return [head, ...specs].filter(Boolean).join(' · ');
};

/**
 * Formes historiques du même accessoire, pour rattacher une sélection enregistrée avant un
 * changement de libellé. Utilisées uniquement quand elles désignent un seul accessoire.
 */
const legacyLabels = (opt: AccessoryOption): string[] => {
  const description = opt.field_5 || opt.Title;
  return [
    [description, opt.Ame].filter(Boolean).join(' - '), // mapper d'avant le 2026-08-21
    description,                                        // mapper d'avant l'ajout de l'âme
    opt.Title,
  ].filter(Boolean);
};

const countBy = (labels: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return counts;
};

/**
 * Construit un libellé par option, garanti unique quand les données le permettent.
 *
 * Le code SAP n'est ajouté qu'aux rares options que type + description + section +
 * tension + âme ne suffisent pas à séparer. Sans cette unicité, les 5 « Support
 * autoporteur » ne produisaient que 2 libellés : l'utilisateur ne pouvait pas choisir sa
 * section, et les lignes fusionnaient en une seule entrée de quantité 3.
 */
export const buildAccessoryLabels = (options: AccessoryOption[]): string[] => {
  const base = options.map(baseLabel);
  const counts = countBy(base);

  return base.map((label, i) => {
    if ((counts.get(label) ?? 0) <= 1) return label;
    const sap = options[i].field_2;
    return sap ? `${label} · ${sap}` : label;
  });
};

/** Lit `ListAccessoire`. Tolère vide, absent, JSON invalide ou forme inattendue. */
export const parseListAccessoire = (raw?: string | null): ListAccessoireEntry[] => {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({
      id: typeof e.id === 'number' ? e.id : -1,
      value: typeof e.value === 'string' ? e.value : '',
      quantity: typeof e.quantity === 'number' && e.quantity > 0 ? e.quantity : 1,
    }))
    .filter((e) => e.value !== '');
};

export const serializeListAccessoire = (entries: ListAccessoireEntry[]): string =>
  JSON.stringify(entries);

/**
 * Rattache les libellés sélectionnés à des ID du référentiel.
 *
 * Cascade, du plus sûr au moins sûr :
 *   1. libellé courant exact,
 *   2. libellé courant à la normalisation près (espaces, casse),
 *   3. ID mémorisé dans `ListAccessoire` pour ce libellé — c'est ce qui sauve les fiches
 *      enregistrées avant un changement de mapper,
 *   4. préfixe d'un libellé courant, *uniquement* si un seul candidat correspond.
 *
 * Ambigu ou introuvable ⇒ `unresolved`. Deviner enverrait un mauvais ID au flux, qui
 * copierait alors le plan et la notice d'un autre accessoire sans rien signaler.
 */
export const resolveAccessories = (
  selectedLabels: string[],
  options: AccessoryOption[],
  previous: ListAccessoireEntry[] = [],
): AccessoryResolution => {
  const labels = buildAccessoryLabels(options);

  const byLabel = new Map<string, number>();
  const byNormalized = new Map<string, number>();
  const byId = new Map<number, number>();
  const byAlias = new Map<string, number[]>();
  options.forEach((opt, i) => {
    const id = accessoryId(opt);
    if (id === undefined || id < 0) return;
    if (!byLabel.has(labels[i])) byLabel.set(labels[i], i);
    if (!byNormalized.has(normalize(labels[i]))) byNormalized.set(normalize(labels[i]), i);
    if (!byId.has(id)) byId.set(id, i);
    for (const alias of legacyLabels(opt)) {
      const key = normalize(alias);
      const bucket = byAlias.get(key);
      if (bucket) bucket.push(i);
      else byAlias.set(key, [i]);
    }
  });

  const rememberedId = new Map<string, number>();
  for (const entry of previous) {
    if (entry.id > 0 && !rememberedId.has(entry.value)) rememberedId.set(entry.value, entry.id);
  }

  const indexFor = (label: string): number | undefined => {
    const exact = byLabel.get(label);
    if (exact !== undefined) return exact;

    const normalized = byNormalized.get(normalize(label));
    if (normalized !== undefined) return normalized;

    const remembered = rememberedId.get(label);
    if (remembered !== undefined && byId.has(remembered)) return byId.get(remembered);

    const needle = normalize(label);
    const alias = byAlias.get(needle);
    if (alias?.length === 1) return alias[0];

    const prefixed = [...byNormalized.entries()].filter(([key]) => key.startsWith(needle));
    return prefixed.length === 1 ? prefixed[0][1] : undefined;
  };

  const resolved: ResolvedAccessory[] = [];
  const positionOf = new Map<number, number>();
  const unresolved: string[] = [];

  for (const label of selectedLabels) {
    const index = indexFor(label);
    if (index === undefined) {
      unresolved.push(label);
      continue;
    }
    const id = accessoryId(options[index])!;
    const at = positionOf.get(id);
    if (at === undefined) {
      positionOf.set(id, resolved.length);
      resolved.push({ id, label: labels[index], quantity: 1 });
    } else {
      resolved[at].quantity += 1;
    }
  }

  return { resolved, unresolved };
};

/** Forme attendue par une colonne de recherche SharePoint multiple. */
export const toSharePointLookup = (
  resolved: ResolvedAccessory[],
  options: AccessoryOption[],
): { Id: number; Value: string; '@odata.type': string }[] => {
  const titleById = new Map<number, string>();
  for (const opt of options) {
    const id = accessoryId(opt);
    if (id !== undefined) titleById.set(id, opt.Title);
  }
  return resolved.map((r) => ({
    Id: r.id,
    Value: titleById.get(r.id) ?? r.label,
    '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference',
  }));
};

/**
 * Ramène une sélection sur les libellés du référentiel courant.
 *
 * Quand Power Apps renvoie une nouvelle version de la liste, un libellé peut changer (suffixe
 * SAP ajouté pour rester unique, description corrigée). Sans cette migration, le wizard
 * afficherait « introuvable » et ajouterait un doublon au prochain clic. Les libellés
 * irrésolus restent tels quels pour continuer d'être signalés à la sauvegarde.
 */
export const relabelAccessories = (
  selected: string[],
  options: AccessoryOption[],
  previous: ListAccessoireEntry[] = [],
): string[] => {
  const current = new Map<string, string>();
  for (const label of new Set(selected)) {
    const [match] = resolveAccessories([label], options, previous).resolved;
    current.set(label, match?.label ?? label);
  }
  const next = selected.map((label) => current.get(label) ?? label);
  return next.every((label, i) => label === selected[i]) ? selected : next;
};
