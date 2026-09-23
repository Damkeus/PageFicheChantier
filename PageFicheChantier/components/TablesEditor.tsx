import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Sparkles, PenLine, Plus, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { CONFIDENCE_COLORS, ConfidenceLevel } from '../confidence';
import { Toast } from './Toast';
import {
  SECTION_DEFS,
  SectionDef,
  SectionId,
  GridRow,
  ParsedSection,
  SavedTables,
  parseCctpTables,
  parseSavedTables,
  hasSavedRows,
  serializeSection,
  emptyRow,
  seedRows,
  seedSectionFromSaved,
} from '../tables';

interface TablesEditorProps {
  cctpJson?: string;
  /** JSON combiné des colonnes déjà enregistrées. Prime toujours sur l'IA. */
  savedTablesJson?: string;
  onSaveSection: (outputKey: string, json: string) => void;
  onBack: () => void;
}

type Mode = 'ai' | 'manual';

// Modèle éditable : par section → par grille → lignes
type EditState = Record<SectionId, GridRow[][]>;

const RED = '#A30026';

/**
 * Amorçage d'une section : l'enregistrement SharePoint prime intégralement ;
 * à défaut seulement, on part de l'extraction IA.
 */
function seedSection(def: SectionDef, parsed: Record<SectionId, ParsedSection>, saved: SavedTables): GridRow[][] {
  return hasSavedRows(saved[def.id])
    ? seedSectionFromSaved(def, saved[def.id])
    : parsed[def.id].grids.map((g) => seedRows(g));
}

function seedAll(parsed: Record<SectionId, ParsedSection>, saved: SavedTables): EditState {
  const state = {} as EditState;
  for (const def of SECTION_DEFS) state[def.id] = seedSection(def, parsed, saved);
  return state;
}

export function TablesEditor({ cctpJson, savedTablesJson, onSaveSection, onBack }: TablesEditorProps) {
  const parsed = useMemo(() => parseCctpTables(cctpJson), [cctpJson]);
  const saved = useMemo(() => parseSavedTables(savedTablesJson), [savedTablesJson]);

  /** Section déjà écrite par un utilisateur : édition directe, plus d'onglet IA. */
  const locked = useMemo(() => {
    const l = {} as Record<SectionId, boolean>;
    for (const def of SECTION_DEFS) l[def.id] = hasSavedRows(saved[def.id]);
    return l;
  }, [saved]);

  const [activeId, setActiveId] = useState<SectionId>(SECTION_DEFS[0].id);
  const [mode, setMode] = useState<Record<SectionId, Mode>>(() => {
    const m = {} as Record<SectionId, Mode>;
    for (const s of SECTION_DEFS) m[s.id] = 'ai';
    return m;
  });
  const [justSaved, setJustSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [edited, setEdited] = useState<EditState>(() => seedAll(parsed, saved));

  // Sections modifiées et non encore enregistrées. Le ref est la source de
  // vérité synchrone (lu dans les effets), l'état ne sert qu'au rendu.
  const [dirty, setDirty] = useState<ReadonlySet<SectionId>>(() => new Set<SectionId>());
  const dirtyRef = useRef<ReadonlySet<SectionId>>(dirty);

  const markDirty = (id: SectionId) => {
    setJustSaved(false);
    if (dirtyRef.current.has(id)) return;
    const next = new Set(dirtyRef.current);
    next.add(id);
    dirtyRef.current = next;
    setDirty(next);
  };

  const clearDirty = (ids: SectionId[]) => {
    const next = new Set(dirtyRef.current);
    for (const id of ids) next.delete(id);
    dirtyRef.current = next;
    setDirty(next);
  };

  /**
   * Ré-amorçage quand Power Apps repousse les entrées (ex. après un Patch, ou
   * quand le JSON IA arrive avec ~1 min de retard). Les sections en cours de
   * saisie sont préservées. Aucun output n'est émis ici : pas de boucle.
   */
  useEffect(() => {
    setEdited((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const def of SECTION_DEFS) {
        if (dirtyRef.current.has(def.id)) continue;
        const fresh = seedSection(def, parsed, saved);
        if (JSON.stringify(fresh) !== JSON.stringify(prev[def.id])) {
          next[def.id] = fresh;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [parsed, saved]);

  const activeSection = SECTION_DEFS.find((s) => s.id === activeId) ?? SECTION_DEFS[0];
  const activeParsed = parsed[activeId];
  const isLocked = locked[activeId];
  const activeMode: Mode = isLocked ? 'manual' : mode[activeId];
  const hasUnsaved = dirty.size > 0;

  const setCell = (gridIdx: number, rowIdx: number, col: string, value: string) => {
    markDirty(activeId);
    setEdited((prev) => {
      const next: EditState = { ...prev, [activeId]: prev[activeId].map((g) => g.map((r) => ({ ...r }))) };
      next[activeId][gridIdx][rowIdx][col] = value;
      return next;
    });
  };

  const addRow = (gridIdx: number) => {
    markDirty(activeId);
    setEdited((prev) => ({
      ...prev,
      [activeId]: prev[activeId].map((g, gi) =>
        gi === gridIdx
          ? [...g.map((r) => ({ ...r })), emptyRow(activeSection.grids[gridIdx].columns)]
          : g.map((r) => ({ ...r }))
      ),
    }));
  };

  const removeRow = (gridIdx: number, rowIdx: number) => {
    markDirty(activeId);
    setEdited((prev) => ({
      ...prev,
      [activeId]: prev[activeId].map((g, gi) =>
        gi === gridIdx ? g.filter((_, ri) => ri !== rowIdx) : g.map((r) => ({ ...r }))
      ),
    }));
  };

  /** N'émet QUE les sections modifiées : les autres colonnes restent intactes. */
  const handleSave = () => {
    const touched = SECTION_DEFS.filter((s) => dirty.has(s.id));
    if (touched.length === 0) {
      setToastMsg('Aucune modification à enregistrer');
      setShowToast(true);
      return;
    }
    for (const s of touched) {
      const grids = s.grids.map((g, i) => ({ key: g.key, columns: g.columns, rows: edited[s.id][i] }));
      onSaveSection(s.outputKey, serializeSection(grids));
    }
    clearDirty(touched.map((s) => s.id));
    setJustSaved(true);
    setToastMsg(touched.length > 1 ? `${touched.length} tableaux CCTP enregistrés` : 'Tableaux CCTP enregistrés');
    setShowToast(true);
  };

  const requestBack = () => (hasUnsaved ? setConfirmLeave(true) : onBack());

  const saveButton = (label?: string) => (
    <button
      onClick={handleSave}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
      style={{ background: RED, opacity: hasUnsaved || !justSaved ? 1 : 0.75 }}
    >
      <Save className="w-4 h-4" />
      {label ?? (justSaved && !hasUnsaved ? 'Enregistré' : 'Enregistrer')}
    </button>
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50">
      <Toast message={toastMsg} show={showToast} onHide={() => setShowToast(false)} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span style={{ width: 8, height: 22, background: RED, borderRadius: 2 }} />
          <span className="font-bold text-gray-900" style={{ fontSize: 16 }}>Tableaux CCTP</span>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsaved && (
            <span className="text-xs font-medium mr-1" style={{ color: '#B45F08' }}>
              Modifications non enregistrées
            </span>
          )}
          {saveButton()}
          <button onClick={requestBack} aria-label="Fermer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={active ? { background: RED, color: '#fff' } : { background: '#F5F6F8', color: '#5A6472' }}
            >
              {s.label}
              {dirty.has(s.id) && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : '#E8830C' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto p-6">
        {/* Bascule IA / Saisie main — masquée dès que la section a été enregistrée */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {isLocked ? (
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(31,157,85,0.10)', color: '#1F9D55' }}
            >
              <Lock className="w-4 h-4" /> Données enregistrées
            </span>
          ) : (
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
          )}
          <span className="text-xs text-gray-500">
            {isLocked
              ? 'Ces lignes viennent de la fiche enregistrée — elles remplacent l’extraction IA.'
              : activeMode === 'ai'
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

        {/* Barre d'action basse : le bouton de l'en-tête sort du viewport dès que
            la page Power Apps est scrollée. */}
        {activeMode === 'manual' && (
          <div
            className="sticky bottom-0 flex items-center justify-end gap-3 -mx-6 px-6 py-3 bg-white border-t border-gray-200"
            style={{ boxShadow: '0 -2px 8px rgba(15,23,42,0.06)' }}
          >
            <span className="text-xs" style={{ color: hasUnsaved ? '#B45F08' : '#94A3B8' }}>
              {hasUnsaved ? 'Modifications non enregistrées' : 'Tout est enregistré'}
            </span>
            {saveButton()}
          </div>
        )}
      </div>

      {/* Confirmation de sortie */}
      {confirmLeave && (
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(15,23,42,0.45)' }}>
          <div className="bg-white rounded-xl shadow-xl p-6" style={{ maxWidth: 420 }}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5" style={{ color: '#E8830C' }} />
              <h3 className="font-bold text-gray-900" style={{ fontSize: 15 }}>Quitter sans enregistrer ?</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Des modifications n’ont pas été enregistrées. Elles seront perdues si vous fermez maintenant.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Continuer la saisie
              </button>
              <button
                onClick={() => { setConfirmLeave(false); handleSave(); onBack(); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: RED }}
              >
                Enregistrer et quitter
              </button>
              <button
                onClick={() => { setConfirmLeave(false); onBack(); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
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
