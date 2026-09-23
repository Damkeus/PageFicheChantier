import React, { useMemo, useState } from 'react';
import { Check, Plus, Search, TriangleAlert } from 'lucide-react';
import {
  ACCESSORY_TYPES,
  AccessorySpec,
  AccessoryTypeKey,
  CableSpec,
  Compatibility,
  bestCompatibility,
  cableShortLabel,
} from '../../accessoryCatalog';
import { TypeThumb } from './typeVisuals';
import { MetalBadge } from './MetalBadge';

/** Portée du filtre : `cables` (tous ceux de la fiche), `all` (aucun filtre) ou le libellé d'un câble. */
type Scope = string;

const COMPAT_BADGE: Record<Exclude<Compatibility, 'none'>, { text: string; className: string; title: string }> = {
  exact: {
    text: 'Compatible',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Tension, section et âme identiques au câble',
  },
  generic: {
    text: 'À vérifier',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    title: 'Tension, section ou âme non renseignée dans le référentiel',
  },
};

const TypeTile: React.FC<{ type: AccessoryTypeKey | 'all'; label: string; count: number; active: boolean; onClick: () => void }> = ({
  type,
  label,
  count,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex flex-col items-center gap-1.5 w-28 flex-shrink-0 rounded-xl border-2 p-2 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A30026]/20 ${
      active ? 'border-[#A30026] bg-[#fff7f8] shadow-md' : 'border-transparent bg-white hover:border-gray-300'
    }`}
  >
    {type === 'all' ? (
      <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg font-black ${active ? 'bg-[#A30026] text-white' : 'bg-[#faf8f6] text-gray-700 border border-gray-200'}`}>
        {count}
      </div>
    ) : (
      <TypeThumb type={type} size="md" active={active} />
    )}
    <span className={`text-xs font-semibold leading-tight text-center ${active ? 'text-[#A30026]' : 'text-gray-700'}`}>{label}</span>
    {type !== 'all' && <span className="text-[11px] tabular-nums text-gray-400">{count}</span>}
  </button>
);

const AccessoryRow: React.FC<{
  spec: AccessorySpec;
  level: Compatibility;
  quantity: number;
  readOnly: boolean;
  onAdd: () => void;
}> = ({ spec, level, quantity, readOnly, onAdd }) => {
  const badge = level === 'none' ? undefined : COMPAT_BADGE[level];
  const selected = quantity > 0;
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        selected ? 'border-[#A30026]/40 bg-[#fff7f8]' : 'border-gray-200 bg-white hover:border-gray-300'
      } ${level === 'none' ? 'opacity-60' : ''}`}
    >
      <TypeThumb type={spec.type} size="sm" active={selected} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{spec.description ?? spec.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500">{spec.title}</span>
          {spec.tensionKv !== undefined && <span className="px-1.5 rounded bg-gray-100 font-semibold tabular-nums">{spec.tensionKv} kV</span>}
          {spec.sectionMm2 !== undefined && <span className="px-1.5 rounded bg-gray-100 font-semibold tabular-nums">{spec.sectionMm2} mm²</span>}
          {spec.metals.map((m) => (
            <MetalBadge key={m} metal={m} size="sm" />
          ))}
          {spec.sap && <span className="text-gray-400 tabular-nums">SAP {spec.sap}</span>}
          {badge && (
            <span title={badge.title} className={`px-1.5 rounded border font-semibold ${badge.className}`}>{badge.text}</span>
          )}
          {level === 'none' && <span className="px-1.5 rounded border border-gray-200 text-gray-500">Hors câbles choisis</span>}
          {spec.warnings.length > 0 && (
            <span title={spec.warnings.join('\n')} className="inline-flex items-center gap-1 px-1.5 rounded border border-orange-300 bg-orange-50 text-orange-800 font-semibold">
              <TriangleAlert className="w-3 h-3" aria-hidden /> Donnée incohérente
              <span className="sr-only">: {spec.warnings.join(' ; ')}</span>
            </span>
          )}
        </div>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Ajouter ${spec.description ?? spec.title}`}
          className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40 ${
            selected ? 'bg-[#A30026] text-white hover:bg-[#8a0020]' : 'bg-gray-900 text-white hover:bg-[#A30026]'
          }`}
        >
          {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {selected ? `× ${quantity}` : 'Ajouter'}
        </button>
      )}
    </li>
  );
};

export const AccessoryStep: React.FC<{
  accessories: AccessorySpec[];
  cables: CableSpec[];
  counts: Map<string, number>;
  readOnly: boolean;
  onAdd: (spec: AccessorySpec) => void;
}> = ({ accessories, cables, counts, readOnly, onAdd }) => {
  const [rawScope, setScope] = useState<Scope>('cables');
  // Un câble retiré à l'étape 1 ne doit pas laisser un filtre orphelin.
  const scope = rawScope === 'all' || cables.some((c) => c.label === rawScope) ? rawScope : 'cables';
  const [type, setType] = useState<AccessoryTypeKey | 'all'>('all');
  const [search, setSearch] = useState('');

  const scopedCables = useMemo(() => {
    if (scope === 'all' || scope === 'cables') return cables;
    return cables.filter((c) => c.label === scope);
  }, [cables, scope]);

  // Niveau de compatibilité calculé une fois, puis filtré : `all` montre les incompatibles grisés.
  const withLevel = useMemo(
    () =>
      accessories
        .map((spec) => ({ spec, level: bestCompatibility(spec, scopedCables) }))
        .filter(({ level }) => scope === 'all' || level !== 'none'),
    [accessories, scopedCables, scope],
  );

  const typeCounts = useMemo(() => {
    const byType = new Map<AccessoryTypeKey, number>();
    withLevel.forEach(({ spec }) => byType.set(spec.type, (byType.get(spec.type) ?? 0) + 1));
    return byType;
  }, [withLevel]);

  // Le type choisi peut disparaître quand la portée change : on retombe sur « Tous ».
  const activeType = type !== 'all' && !typeCounts.has(type) ? 'all' : type;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rank: Record<Compatibility, number> = { exact: 0, generic: 1, none: 2 };
    return withLevel
      .filter(({ spec }) => activeType === 'all' || spec.type === activeType)
      .filter(({ spec }) => !needle || `${spec.label} ${spec.sap ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => rank[a.level] - rank[b.level]);
  }, [withLevel, activeType, search]);

  return (
    <section aria-labelledby="accessory-step-title" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer selon les câbles">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Pour</span>
        {cables.length > 1 && (
          <ScopeChip active={scope === 'cables'} onClick={() => setScope('cables')}>Tous mes câbles</ScopeChip>
        )}
        {cables.map((c) => (
          <ScopeChip
            key={c.label}
            active={scope === c.label || (cables.length === 1 && scope === 'cables')}
            onClick={() => setScope(c.label)}
          >
            {cableShortLabel(c)}
          </ScopeChip>
        ))}
        <ScopeChip active={scope === 'all'} onClick={() => setScope('all')}>Tout le référentiel</ScopeChip>
      </div>

      {cables.length === 0 && scope !== 'all' && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Aucun câble choisi : le catalogue n&apos;est pas filtré. Revenez à l&apos;étape 1 pour un filtrage automatique.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Type d'élément">
        <TypeTile type="all" label="Tous" count={withLevel.length} active={activeType === 'all'} onClick={() => setType('all')} />
        {ACCESSORY_TYPES.filter((t) => typeCounts.has(t.key)).map((t) => (
          <TypeTile
            key={t.key}
            type={t.key}
            label={t.label}
            count={typeCounts.get(t.key) ?? 0}
            active={activeType === t.key}
            onClick={() => setType(t.key)}
          />
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Rechercher un accessoire</span>
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par désignation ou code SAP…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A30026]/30 focus:border-[#A30026]"
        />
      </label>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 border border-dashed rounded-xl">
          Aucun accessoire compatible. Essayez « Tout le référentiel ».
        </p>
      ) : (
        <ul className="space-y-2 max-h-[520px] overflow-auto pr-1">
          {visible.map(({ spec, level }) => (
            <AccessoryRow
              key={spec.id ?? spec.label}
              spec={spec}
              level={level}
              quantity={counts.get(spec.label) ?? 0}
              readOnly={readOnly}
              onAdd={() => onAdd(spec)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const ScopeChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40 ${
      active ? 'bg-[#A30026] border-[#A30026] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
    }`}
  >
    {children}
  </button>
);
