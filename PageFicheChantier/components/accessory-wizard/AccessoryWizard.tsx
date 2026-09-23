import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { AccessoryOption, buildAccessoryLabels } from '../../accessories';
import {
  AccessorySpec,
  CableOption,
  bestCompatibility,
  CableSpec,
  cableShortLabel,
  countSelections,
  findSelectedCables,
  isCableRow,
  setQuantity,
  toAccessorySpecs,
  toCableSpec,
} from '../../accessoryCatalog';
import { CableStep } from './CableStep';
import { AccessoryStep } from './AccessoryStep';
import { AccessoryRecap, RecapLine } from './AccessoryRecap';

type WizardStep = 1 | 2;

export interface AccessoryWizardProps {
  cableOptions: CableOption[];
  accessoryOptions: AccessoryOption[];
  selectedCableLabels: string[];
  selectedCableIds: number[];
  onCablesChange: (next: CableOption[]) => void;
  /** Libellés d'accessoires ; la répétition d'un libellé porte la quantité. */
  selectedAccessories: string[];
  onAccessoriesChange: (next: string[]) => void;
  readOnly?: boolean;
}

const StepPill: React.FC<{ index: WizardStep; title: string; hint: string; active: boolean; done: boolean; onClick: () => void }> = ({
  index,
  title,
  hint,
  active,
  done,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'step' : undefined}
    className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A30026]/20 ${
      active ? 'bg-[#1f1a17] text-white shadow-lg' : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
    }`}
  >
    <span
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
        active ? 'bg-[#A30026] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {done && !active ? <Check className="w-4 h-4" strokeWidth={3} /> : index}
    </span>
    <span className="min-w-0">
      <span id={index === 1 ? 'cable-step-title' : 'accessory-step-title'} className="block text-sm font-bold">{title}</span>
      <span className={`block text-xs truncate ${active ? 'text-white/60' : 'text-gray-400'}`}>{hint}</span>
    </span>
  </button>
);

export const AccessoryWizard: React.FC<AccessoryWizardProps> = ({
  cableOptions,
  accessoryOptions,
  selectedCableLabels,
  selectedCableIds,
  onCablesChange,
  selectedAccessories,
  onAccessoriesChange,
  readOnly = false,
}) => {
  const cableRows = useMemo(() => cableOptions.filter(isCableRow), [cableOptions]);
  const cableSpecs = useMemo(() => cableRows.map(toCableSpec), [cableRows]);

  const selectedCables = useMemo(
    () => findSelectedCables(cableRows, selectedCableLabels, selectedCableIds),
    [cableRows, selectedCableLabels, selectedCableIds],
  );
  const selectedCableSpecs = useMemo(() => selectedCables.map(toCableSpec), [selectedCables]);
  const selectedCableKeys = useMemo(() => new Set(selectedCableSpecs.map((c) => c.label)), [selectedCableSpecs]);

  const accessorySpecs = useMemo(
    () => toAccessorySpecs(accessoryOptions, buildAccessoryLabels(accessoryOptions)),
    [accessoryOptions],
  );
  const specByLabel = useMemo(() => new Map(accessorySpecs.map((s) => [s.label, s])), [accessorySpecs]);
  const counts = useMemo(() => countSelections(selectedAccessories), [selectedAccessories]);

  // Fiche déjà équipée de câbles : on ouvre directement sur les accessoires.
  const [step, setStep] = useState<WizardStep>(() => (selectedCables.length > 0 ? 2 : 1));

  const recapLines: RecapLine[] = useMemo(
    () =>
      [...counts.entries()].map(([label, quantity]) => {
        const spec = specByLabel.get(label);
        const outOfScope = spec !== undefined && bestCompatibility(spec, selectedCableSpecs) === 'none';
        return { label, quantity, spec, outOfScope };
      }),
    [counts, specByLabel, selectedCableSpecs],
  );

  const toggleCable = (spec: CableSpec) => {
    if (readOnly) return;
    const isSelected = selectedCableKeys.has(spec.label);
    const next = isSelected
      ? selectedCables.filter((c) => toCableSpec(c).label !== spec.label)
      : [...selectedCables, ...cableRows.filter((c) => toCableSpec(c).label === spec.label).slice(0, 1)];
    onCablesChange(next);
  };

  const addAccessory = (spec: AccessorySpec) => {
    if (readOnly) return;
    onAccessoriesChange(setQuantity(selectedAccessories, spec.label, (counts.get(spec.label) ?? 0) + 1));
  };

  const changeQuantity = (label: string, quantity: number) => {
    if (readOnly) return;
    onAccessoriesChange(setQuantity(selectedAccessories, label, quantity));
  };

  if (cableSpecs.length === 0 && accessorySpecs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
        Référentiels câbles et accessoires non chargés : vérifiez les collections transmises par Power Apps.
      </p>
    );
  }

  const cableHint =
    selectedCableSpecs.length === 0
      ? 'Tension, section, âme'
      : selectedCableSpecs.map(cableShortLabel).join('  |  ');
  const accessoryHint = recapLines.length === 0 ? 'Filtrés selon vos câbles' : `${recapLines.length} référence(s) sélectionnée(s)`;

  return (
    <div className="space-y-6">
      <nav aria-label="Étapes de sélection" className="flex flex-col sm:flex-row gap-2">
        <StepPill index={1} title="Câbles" hint={cableHint} active={step === 1} done={selectedCables.length > 0} onClick={() => setStep(1)} />
        <StepPill index={2} title="Accessoires" hint={accessoryHint} active={step === 2} done={recapLines.length > 0} onClick={() => setStep(2)} />
      </nav>

      {step === 1 ? (
        <>
          <CableStep cables={cableSpecs} selectedLabels={selectedCableKeys} readOnly={readOnly} onToggle={toggleCable} />
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-500">
              {selectedCables.length === 0
                ? 'Sélectionnez un ou plusieurs câbles.'
                : `${selectedCables.length} câble${selectedCables.length > 1 ? 's' : ''} sélectionné${selectedCables.length > 1 ? 's' : ''}`}
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="group inline-flex items-center gap-2 rounded-lg bg-[#A30026] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#8a0020] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A30026]/30"
            >
              {selectedCables.length === 0 ? 'Voir tous les accessoires' : 'Choisir les accessoires'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
            <AccessoryStep
              accessories={accessorySpecs}
              cables={selectedCableSpecs}
              counts={counts}
              readOnly={readOnly}
              onAdd={addAccessory}
            />
            <AccessoryRecap lines={recapLines} readOnly={readOnly} onQuantity={changeQuantity} />
          </div>
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#A30026]"
            >
              <ArrowLeft className="w-4 h-4" /> Modifier les câbles
            </button>
          </div>
        </>
      )}
    </div>
  );
};
