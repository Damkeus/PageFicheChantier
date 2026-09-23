import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { CableSpec, Metal } from '../../accessoryCatalog';
import { MetalBadge } from './MetalBadge';

type TensionFilter = 'all' | 'earth' | number;

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40 ${
      active
        ? 'bg-[#1f1a17] border-[#1f1a17] text-white'
        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const CableCard: React.FC<{ spec: CableSpec; selected: boolean; readOnly: boolean; onToggle: () => void }> = ({
  spec,
  selected,
  readOnly,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={readOnly}
    aria-pressed={selected}
    className={`group relative text-left rounded-xl border-2 p-4 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A30026]/20 ${
      selected
        ? 'border-[#A30026] bg-[#fff7f8] shadow-lg shadow-red-900/10 -translate-y-0.5'
        : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5'
    } ${readOnly ? 'cursor-default hover:translate-y-0' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? 'bg-[#A30026] border-[#A30026] scale-100' : 'border-gray-300 bg-white scale-90 group-hover:scale-100'
      }`}
    >
      {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
    </span>

    <div className="flex items-baseline gap-1">
      {spec.tensionKv !== undefined ? (
        <>
          <span className="text-4xl font-black tracking-tight tabular-nums text-[#1f1a17]">{spec.tensionKv}</span>
          <span className="text-sm font-bold text-[#A30026]">kV</span>
        </>
      ) : (
        <span className="text-2xl font-black tracking-tight text-[#1f1a17]">Terre</span>
      )}
    </div>

    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {spec.sectionMm2 !== undefined && (
        <span className="px-2 py-0.5 rounded bg-gray-900/5 text-sm font-semibold tabular-nums text-gray-800">
          {spec.sectionMm2} mm²
        </span>
      )}
      {spec.metals.map((m) => (
        <MetalBadge key={m} metal={m} />
      ))}
      {spec.details && (
        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-xs font-medium">{spec.details}</span>
      )}
    </div>

    <p className="mt-3 text-xs text-gray-500 truncate">{spec.reference ?? spec.title}</p>
  </button>
);

export const CableStep: React.FC<{
  cables: CableSpec[];
  selectedLabels: Set<string>;
  readOnly: boolean;
  onToggle: (spec: CableSpec) => void;
}> = ({ cables, selectedLabels, readOnly, onToggle }) => {
  const [search, setSearch] = useState('');
  const [tension, setTension] = useState<TensionFilter>('all');
  const [metal, setMetal] = useState<Metal | 'all'>('all');

  const tensions = useMemo(
    () => [...new Set(cables.map((c) => c.tensionKv).filter((t): t is number => t !== undefined))].sort((a, b) => a - b),
    [cables],
  );
  const hasEarth = cables.some((c) => c.isEarth);
  const metals = useMemo(() => [...new Set(cables.flatMap((c) => c.metals))], [cables]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cables
      // En consultation, le catalogue complet n'apporte rien : seuls les câbles de la fiche.
      .filter((c) => !readOnly || selectedLabels.has(c.label))
      .filter((c) => {
        if (tension === 'earth' && !c.isEarth) return false;
        if (typeof tension === 'number' && c.tensionKv !== tension) return false;
        if (metal !== 'all' && !c.metals.includes(metal)) return false;
        return !needle || c.label.toLowerCase().includes(needle);
      })
      .sort(
        (a, b) =>
          (a.tensionKv ?? Infinity) - (b.tensionKv ?? Infinity) ||
          (a.sectionMm2 ?? 0) - (b.sectionMm2 ?? 0) ||
          a.label.localeCompare(b.label),
      );
  }, [cables, search, tension, metal, readOnly, selectedLabels]);

  return (
    <section aria-labelledby="cable-step-title" className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par tension">
          <Chip active={tension === 'all'} onClick={() => setTension('all')}>Toutes tensions</Chip>
          {tensions.map((t) => (
            <Chip key={t} active={tension === t} onClick={() => setTension(t)}>{t} kV</Chip>
          ))}
          {hasEarth && <Chip active={tension === 'earth'} onClick={() => setTension('earth')}>Câbles de terre</Chip>}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Rechercher un câble</span>
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un câble…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A30026]/30 focus:border-[#A30026]"
          />
        </label>
      </div>

      {metals.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par âme">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Âme</span>
          <Chip active={metal === 'all'} onClick={() => setMetal('all')}>Toutes</Chip>
          {metals.map((m) => (
            <Chip key={m} active={metal === m} onClick={() => setMetal(m)}>{m}</Chip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 border border-dashed rounded-xl">
          {readOnly ? 'Aucun câble renseigné sur cette fiche.' : 'Aucun câble ne correspond à ces filtres.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {visible.map((spec) => (
            <CableCard
              key={spec.id ?? spec.label}
              spec={spec}
              selected={selectedLabels.has(spec.label)}
              readOnly={readOnly}
              onToggle={() => onToggle(spec)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
