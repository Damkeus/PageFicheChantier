import React from 'react';
import { Minus, Plus, TriangleAlert, X } from 'lucide-react';
import { AccessorySpec, accessoryTypeLabel } from '../../accessoryCatalog';
import { TypeThumb } from './typeVisuals';
import { MetalBadge } from './MetalBadge';

export interface RecapLine {
  label: string;
  quantity: number;
  /** Absent : libellé enregistré qui ne correspond plus au référentiel. */
  spec?: AccessorySpec;
  /** Aucun câble de la fiche ne correspond (câble retiré ou changé après la sélection). */
  outOfScope?: boolean;
}

const Spec: React.FC<{ term: string; value?: string; children?: React.ReactNode }> = ({ term, value, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{term}</dt>
    <dd className="text-sm font-semibold text-gray-800 tabular-nums truncate">{children ?? (value || '—')}</dd>
  </div>
);

const QuantityStepper: React.FC<{ quantity: number; onChange: (q: number) => void; name: string }> = ({ quantity, onChange, name }) => (
  <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
    <button
      type="button"
      onClick={() => onChange(quantity - 1)}
      aria-label={`Retirer un ${name}`}
      className="p-1.5 text-gray-500 hover:text-[#A30026] hover:bg-red-50 rounded-l-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40"
    >
      <Minus className="w-3.5 h-3.5" />
    </button>
    <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</span>
    <button
      type="button"
      onClick={() => onChange(quantity + 1)}
      aria-label={`Ajouter un ${name}`}
      className="p-1.5 text-gray-500 hover:text-[#A30026] hover:bg-red-50 rounded-r-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);

const RecapCard: React.FC<{ line: RecapLine; readOnly: boolean; onQuantity: (q: number) => void }> = ({ line, readOnly, onQuantity }) => {
  const { spec, quantity } = line;

  if (!spec) {
    return (
      <li className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex gap-3">
        <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Introuvable dans le référentiel</p>
          <p className="text-sm text-amber-900 break-words">{line.label}</p>
          <p className="text-xs text-amber-700 mt-1">Retirez-le puis re-sélectionnez l&apos;accessoire équivalent.</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => onQuantity(0)} aria-label="Retirer" className="self-start p-1 text-amber-700 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </li>
    );
  }

  const name = spec.description ?? spec.title;
  return (
    <li className={`group rounded-xl border bg-white p-3 ${line.outOfScope ? 'border-red-300' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow animate-in fade-in slide-in-from-right-2 duration-300`}>
      <div className="flex gap-3">
        <TypeThumb type={spec.type} size="md" active />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A30026]">{accessoryTypeLabel(spec.type)}</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{spec.title}</p>
          {spec.description && <p className="text-xs text-gray-500 leading-snug mt-0.5">{spec.description}</p>}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onQuantity(0)}
            aria-label={`Retirer ${name}`}
            className="self-start p-1 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30026]/40"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-dashed border-gray-200 pt-2">
        <Spec term="Tension" value={spec.tensionKv !== undefined ? `${spec.tensionKv} kV` : undefined} />
        <Spec term="Section" value={spec.sectionMm2 !== undefined ? `${spec.sectionMm2} mm²` : undefined} />
        <Spec term="Âme">
          {spec.metals.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {spec.metals.map((m) => (
                <MetalBadge key={m} metal={m} size="sm" />
              ))}
            </span>
          ) : (
            '—'
          )}
        </Spec>
        <Spec term="Code SAP" value={spec.sap} />
      </dl>

      {line.outOfScope && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700">
          <TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden /> Ne correspond à aucun câble de la fiche
        </p>
      )}

      {spec.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-orange-50 px-2 py-1.5 text-xs text-orange-800">
          {spec.warnings.map((w) => (
            <li key={w} className="flex items-center gap-1.5">
              <TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">Quantité</span>
        {readOnly ? (
          <span className="text-sm font-bold tabular-nums">× {quantity}</span>
        ) : (
          <QuantityStepper quantity={quantity} onChange={onQuantity} name={spec.title} />
        )}
      </div>
    </li>
  );
};

export const AccessoryRecap: React.FC<{
  lines: RecapLine[];
  readOnly: boolean;
  onQuantity: (label: string, quantity: number) => void;
}> = ({ lines, readOnly, onQuantity }) => {
  const total = lines.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <aside aria-label="Accessoires sélectionnés" className="rounded-2xl bg-[#f5f1ee] p-4 lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-800">Sélection</h4>
        <span className="text-xs font-semibold text-gray-500 tabular-nums">
          {lines.length} réf. · {total} pièce{total > 1 ? 's' : ''}
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-4 py-8 text-center text-sm text-gray-500">
          Ajoutez un accessoire depuis le catalogue : sa fiche apparaîtra ici.
        </p>
      ) : (
        <ul className="space-y-2 max-h-[560px] overflow-auto pr-1">
          {lines.map((line) => (
            <RecapCard key={line.label} line={line} readOnly={readOnly} onQuantity={(q) => onQuantity(line.label, q)} />
          ))}
        </ul>
      )}
    </aside>
  );
};
