import React, { useMemo, useState } from 'react';
import { X, Save, Sparkles, PenLine, Plus, Trash2 } from 'lucide-react';
import { CONFIDENCE_COLORS, ConfidenceLevel } from '../confidence';
import {
  SECTION_DEFS,
  SectionId,
  GridRow,
  parseCctpTables,
  serializeSection,
  emptyRow,
} from '../tables';

interface TablesEditorProps {
  cctpJson?: string;
  onSaveSection: (outputKey: string, json: string) => void;
  onBack: () => void;
}

type Mode = 'ai' | 'manual';

// Modèle éditable : par section → par grille → lignes
type EditState = Record<SectionId, GridRow[][]>;

const RED = '#A30026';

export function TablesEditor({ cctpJson, onSaveSection, onBack }: TablesEditorProps) {
  const parsed = useMemo(() => parseCctpTables(cctpJson), [cctpJson]);

  const [activeId, setActiveId] = useState<SectionId>(SECTION_DEFS[0].id);
  const [mode, setMode] = useState<Record<SectionId, Mode>>(() => {
    const m = {} as Record<SectionId, Mode>;
    for (const s of SECTION_DEFS) m[s.id] = 'ai';
    return m;
  });
  const [saved, setSaved] = useState(false);

  // Amorçage Saisie main = copie profonde des lignes IA.
  const [edited, setEdited] = useState<EditState>(() => {
    const state = {} as EditState;
    for (const s of SECTION_DEFS) {
      state[s.id] = parsed[s.id].grids.map((g) => g.rows.map((r) => ({ ...r })));
    }
    return state;
  });

  const activeSection = SECTION_DEFS.find((s) => s.id === activeId) ?? SECTION_DEFS[0];
  const activeParsed = parsed[activeId];
  const activeMode = mode[activeId];

  const setCell = (gridIdx: number, rowIdx: number, col: string, value: string) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx][rowIdx][col] = value;
      return next;
    });
  };

  const addRow = (gridIdx: number) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx].push(emptyRow(activeSection.grids[gridIdx].columns));
      return next;
    });
  };

  const removeRow = (gridIdx: number, rowIdx: number) => {
    setSaved(false);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx].splice(rowIdx, 1);
      return next;
    });
  };

  const handleSave = () => {
    for (const s of SECTION_DEFS) {
      const grids = s.grids.map((g, i) => ({ key: g.key, columns: g.columns, rows: edited[s.id][i] }));
      onSaveSection(s.outputKey, serializeSection(grids));
    }
    setSaved(true);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span style={{ width: 8, height: 22, background: RED, borderRadius: 2 }} />
          <span className="font-bold text-gray-900" style={{ fontSize: 16 }}>Tableaux CCTP</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ background: RED }}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          <button onClick={onBack} aria-label="Fermer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 px-6 py-3 bg-white border-b border-gray-200 flex-wrap">
        {SECTION_DEFS.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={active ? { background: RED, color: '#fff' } : { background: '#F5F6F8', color: '#5A6472' }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto p-6">
        {/* Toggle IA / Saisie main */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setMode((m) => ({ ...m, [activeId]: 'ai' }))}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style={activeMode === 'ai' ? { background: RED, color: '#fff' } : { background: '#fff', color: '#5A6472' }}
            >
              <Sparkles className="w-4 h-4" /> IA Builder
            </button>
            <button
              onClick={() => setMode((m) => ({ ...m, [activeId]: 'manual' }))}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style={activeMode === 'manual' ? { background: RED, color: '#fff' } : { background: '#fff', color: '#5A6472' }}
            >
              <PenLine className="w-4 h-4" /> Saisie main
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {activeMode === 'ai'
              ? 'Extrait par l’IA — lecture seule. Passez en « Saisie main » pour corriger.'
              : 'Saisie manuelle — corrigez, ajoutez ou supprimez des lignes.'}
          </span>
        </div>

        {/* Grilles de la section active */}
        {activeSection.grids.map((gridDef, gridIdx) => {
          const pGrid = activeParsed.grids[gridIdx];
          const rows = edited[activeId][gridIdx];
          return (
            <div key={gridDef.key} className="mb-8">
              {gridDef.title && (
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{gridDef.title}</h3>
              )}

              {/* En-têtes */}
              <div
                className="grid gap-2 px-1 pb-2 text-xs text-gray-500"
                style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
              >
                <span />
                {gridDef.columns.map((c) => <span key={c}>{c}</span>)}
                <span />
              </div>

              {activeMode === 'ai' ? (
                /* Lecture seule + pastilles */
                pGrid.rows.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">Aucune donnée extraite par l’IA.</p>
                ) : (
                  pGrid.rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-2 items-center mb-2"
                      style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
                    >
                      <Dot level={maxLevel(pGrid.levels[rowIdx], gridDef.columns)} />
                      {gridDef.columns.map((c) => (
                        <div key={c} className="px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 truncate" title={row[c]}>
                          {row[c] || <span className="text-gray-300">—</span>}
                        </div>
                      ))}
                      <span />
                    </div>
                  ))
                )
              ) : (
                /* Édition */
                <>
                  {rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-2 items-center mb-2"
                      style={{ gridTemplateColumns: `18px ${gridDef.columns.map(() => '1fr').join(' ')} 36px` }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: CONFIDENCE_COLORS.green.border }} />
                      {gridDef.columns.map((c) => (
                        <input
                          key={c}
                          value={row[c] ?? ''}
                          onChange={(e) => setCell(gridIdx, rowIdx, c, e.target.value)}
                          className="px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]"
                        />
                      ))}
                      <button onClick={() => removeRow(gridIdx, rowIdx)} aria-label="Supprimer la ligne" className="p-2 rounded text-red-400 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addRow(gridIdx)}
                    className="mt-1 flex items-center justify-center gap-2 w-full py-2 border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:bg-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pastille de confiance (lecture seule IA). */
function Dot({ level }: { level: ConfidenceLevel }) {
  const color = level === 'empty' ? '#D0D5DD' : CONFIDENCE_COLORS[level].border;
  return <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />;
}

/** Niveau le plus défavorable d'une ligne (rouge > orange > vert > empty). */
function maxLevel(levels: Record<string, ConfidenceLevel>, columns: string[]): ConfidenceLevel {
  const order: ConfidenceLevel[] = ['red', 'orange', 'green', 'empty'];
  for (const lvl of order) {
    if (columns.some((c) => levels[c] === lvl)) return lvl;
  }
  return 'empty';
}

export default TablesEditor;
