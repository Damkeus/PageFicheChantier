import React, { useState, useEffect } from 'react';
import {
    Download, ArrowLeft, Trash2, HelpCircle, X, Plus, Tag,
    ChevronLeft, ChevronRight, ArrowLeftRight, GripHorizontal, Copy
} from 'lucide-react';
import { SchemaElement, SchemaTool, SchemaLiaison } from '../types';
import { generateOrdreSchema, generateLiaisonId, generateElementId } from '../schemaConstants';
import { Toast } from './Toast';

// Import Base64 Assets from assets.ts
import {
    EXTRMITJPG_IMG,
    EXTRMIT_NZOJPG_IMG,
    JONCTIONJPG_IMG,
    JONCTION_AVEC_MALTJPG_IMG,
    JONCTION_AVEC_ARRT_DCRANJPG_IMG,
    EXT_DROITE_DDIRECTEPNG_IMG
} from '../assets/assets';

interface SchemaEditorProps {
    initialLiaisons: SchemaLiaison[];
    onBack: () => void;
    onSave: (liaisons: SchemaLiaison[]) => void;
}

const TOOLS: SchemaTool[] = [
    { id: 't-simple', type: 'termination', subtype: 'simple', label: 'Extrémité' },
    { id: 't-nzo', type: 'termination', subtype: 'nzo', label: 'ZnO' },
    { id: 't-droite', type: 'termination', subtype: 'droite_directe', label: 'D.Directe' },
    { id: 'j-simple', type: 'joint', subtype: 'simple', label: 'Jonction' },
    { id: 'j-malt', type: 'joint', subtype: 'malt', label: 'Jct Malt' },
    { id: 'j-arret', type: 'joint', subtype: 'arret_ecran', label: 'Jct Arrêt' },
];

// Distance from a card's outer top to the centre of its image row.
// Keeps the connector segments visually aligned with the assets:
// p-3 (12px) + image row h-24 (96px) / 2 = 60px.
const CONNECTOR_OFFSET = 60;

const makeLiaison = (): SchemaLiaison => ({
    id: generateLiaisonId(),
    comment: '',
    ordreSchema: '',
    elements: [],
});

const getAsset = (type: string, subtype?: string): string => {
    if (type === 'termination') {
        if (subtype === 'nzo') return EXTRMIT_NZOJPG_IMG;
        if (subtype === 'droite_directe') return EXT_DROITE_DDIRECTEPNG_IMG;
        return EXTRMITJPG_IMG;
    }
    if (type === 'joint') {
        if (subtype === 'malt') return JONCTION_AVEC_MALTJPG_IMG;
        if (subtype === 'arret_ecran') return JONCTION_AVEC_ARRT_DCRANJPG_IMG;
        return JONCTIONJPG_IMG;
    }
    return '';
};

export const SchemaEditor: React.FC<SchemaEditorProps> = ({ initialLiaisons, onBack, onSave }) => {
    // Multi-liaison state — each liaison is one ordered sequence of elements.
    const [liaisons, setLiaisons] = useState<SchemaLiaison[]>(() =>
        initialLiaisons.length > 0 ? initialLiaisons : [makeLiaison()]
    );
    const [activeLiaisonId, setActiveLiaisonId] = useState<string>(() =>
        initialLiaisons[0]?.id || ''
    );

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [showHelp, setShowHelp] = useState(true);
    const [showToast, setShowToast] = useState(false);

    // Keep the active liaison id valid after add/delete
    useEffect(() => {
        if (!liaisons.find(l => l.id === activeLiaisonId)) {
            setActiveLiaisonId(liaisons[0]?.id ?? '');
        }
    }, [liaisons, activeLiaisonId]);

    const activeLiaison = liaisons.find(l => l.id === activeLiaisonId) ?? liaisons[0];
    const elements = activeLiaison?.elements ?? [];
    const selectedElement = elements.find(e => e.id === selectedElementId) ?? null;
    const selectedIndex = elements.findIndex(e => e.id === selectedElementId);
    const liveOrdre = generateOrdreSchema(elements);

    // --- Element mutations (immutable) ---

    const setElements = (updater: (prev: SchemaElement[]) => SchemaElement[]) => {
        setLiaisons(prev => prev.map(l =>
            l.id === activeLiaison?.id ? { ...l, elements: updater(l.elements) } : l
        ));
    };

    const handleAddTool = (tool: SchemaTool) => {
        const el: SchemaElement = {
            id: generateElementId(elements.length),
            type: tool.type,
            subtype: tool.subtype,
            orientation: 'left',
        };
        setElements(prev => [...prev, el]);
        setSelectedElementId(el.id);
    };

    /** Move an element to a new rank. This is the only ordering primitive. */
    const moveElement = (from: number, to: number) => {
        setElements(prev => {
            if (from === to || to < 0 || to >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const handleFlip = (id: string) => {
        setElements(prev => prev.map(el =>
            el.id === id
                ? { ...el, orientation: el.orientation === 'right' ? 'left' : 'right' }
                : el
        ));
    };

    const handleDeleteElement = (id: string) => {
        setElements(prev => prev.filter(e => e.id !== id));
        setSelectedElementId(prev => (prev === id ? null : prev));
    };

    const handleLabelChange = (val: string) => {
        if (!selectedElementId) return;
        setElements(prev => prev.map(el =>
            el.id === selectedElementId ? { ...el, label: val } : el
        ));
    };

    // --- Drag-to-reorder (mouse-based: HTML5 DnD is unreliable inside PCF) ---

    const handleCardMouseDown = (idx: number, id: string) => {
        setSelectedElementId(id);
        setDragIndex(idx);
    };

    /** Live swap: as the pointer crosses a neighbour, the order updates. */
    const handleCardMouseEnter = (idx: number) => {
        if (dragIndex === null || dragIndex === idx) return;
        moveElement(dragIndex, idx);
        setDragIndex(idx);
    };

    const endDrag = () => setDragIndex(null);

    // --- Liaison handlers ---

    const handleAddLiaison = () => {
        const nl = makeLiaison();
        setLiaisons(prev => [...prev, nl]);
        setActiveLiaisonId(nl.id);
        setSelectedElementId(null);
    };

    const handleSelectLiaison = (id: string) => {
        setActiveLiaisonId(id);
        setSelectedElementId(null);
    };

    const handleDeleteLiaison = (id: string) => {
        setLiaisons(prev => {
            const filtered = prev.filter(l => l.id !== id);
            return filtered.length > 0 ? filtered : [makeLiaison()];
        });
        setSelectedElementId(null);
    };

    /** Duplicate the active liaison (comment + elements), inserted right after it. */
    const handleDuplicateLiaison = () => {
        if (!activeLiaison) return;
        const duplicated: SchemaLiaison = {
            id: generateLiaisonId(),
            comment: activeLiaison.comment,
            ordreSchema: activeLiaison.ordreSchema,
            elements: activeLiaison.elements.map((el, i) => ({
                ...el,
                id: generateElementId(i),
            })),
        };
        setLiaisons(prev => {
            const idx = prev.findIndex(l => l.id === activeLiaison.id);
            const next = [...prev];
            next.splice(idx + 1, 0, duplicated);
            return next;
        });
        setActiveLiaisonId(duplicated.id);
        setSelectedElementId(null);
    };

    const handleCommentChange = (val: string) => {
        if (!activeLiaison) return;
        setLiaisons(prev => prev.map(l =>
            l.id === activeLiaison.id ? { ...l, comment: val } : l
        ));
    };

    const handleSaveClick = () => {
        onSave(liaisons);
        setShowToast(true);
    };

    return (
        <div
            className="absolute inset-0 z-[9999] flex bg-gray-50 overflow-hidden font-sans"
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
        >
            <Toast message="Schéma enregistré" show={showToast} onHide={() => setShowToast(false)} />

            {/* ---------- Left sidebar: palette ---------- */}
            <div className="w-28 bg-white border-r border-gray-200 flex flex-col shadow-lg z-50">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Outils</h3>
                </div>

                <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto">
                    {TOOLS.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => handleAddTool(tool)}
                            title={`Ajouter « ${tool.label} » à la fin de la liaison`}
                            className="group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-[#A30026]/40 hover:bg-red-50/50 hover:shadow-md active:scale-95"
                        >
                            <div className="w-12 h-12 flex items-center justify-center mb-1">
                                <img
                                    src={getAsset(tool.type, tool.subtype)}
                                    alt={tool.label}
                                    className="w-full h-full object-contain pointer-events-none select-none"
                                />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1 leading-tight text-gray-600 group-hover:text-[#A30026]">
                                {tool.label}
                            </span>
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#A30026] text-white items-center justify-center hidden group-hover:flex">
                                <Plus className="w-3 h-3" />
                            </span>
                        </button>
                    ))}
                </div>

                <div className="p-3 border-t border-gray-200 space-y-2">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={`w-full p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${showHelp ? 'text-[#A30026] bg-red-50 ring-1 ring-[#A30026]' : 'text-gray-400 hover:text-[#A30026] hover:bg-red-50 bg-gray-50'}`}
                        title="Aide"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Aide</span>
                    </button>

                    <button
                        onClick={onBack}
                        className="w-full p-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-bold">Retour</span>
                    </button>

                    <button
                        onClick={handleSaveClick}
                        className="w-full p-3 bg-[#A30026] text-white rounded-xl shadow-lg hover:bg-[#8a0020] active:scale-95 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-xs">Enregistrer</span>
                    </button>
                </div>
            </div>

            {/* ---------- Main column ---------- */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {/* Liaison tabs */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {liaisons.map((l, idx) => {
                        const isActive = l.id === activeLiaison?.id;
                        return (
                            <div
                                key={l.id}
                                onClick={() => handleSelectLiaison(l.id)}
                                className={`group flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl cursor-pointer transition-all border ${isActive
                                    ? 'bg-[#A30026] text-white border-[#A30026] shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#A30026]/40 hover:text-gray-900'
                                    }`}
                            >
                                <span className="text-xs font-bold">Liaison {idx + 1}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white/90' : 'bg-gray-100 text-gray-400'}`}>
                                    {l.elements.length}
                                </span>
                                {l.comment && (
                                    <span className={`text-[10px] truncate max-w-[120px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                                        {l.comment}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLiaison(l.id); }}
                                    className={`rounded-full p-0.5 transition-colors ${isActive ? 'hover:bg-white/20' : 'hover:bg-gray-100'}`}
                                    title="Supprimer la liaison"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                    <button
                        onClick={handleAddLiaison}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-dashed border-gray-300 text-gray-500 hover:border-[#A30026] hover:text-[#A30026] transition-all text-xs font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Liaison
                    </button>
                    <button
                        onClick={handleDuplicateLiaison}
                        disabled={!activeLiaison}
                        title="Dupliquer la liaison en cours"
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-dashed border-gray-300 text-gray-500 hover:border-[#A30026] hover:text-[#A30026] transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Copy className="w-4 h-4" />
                        Dupliquer
                    </button>
                </div>

                {/* Comment + live ordre */}
                <div className="flex items-center gap-3 mb-3">
                    <input
                        type="text"
                        value={activeLiaison?.comment ?? ''}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        placeholder="Commentaire de la liaison"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A30026]/40 focus:border-[#A30026]"
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold whitespace-nowrap">
                        <span className="text-gray-400 uppercase tracking-wider">Ordre</span>
                        <span className="text-[#A30026] font-mono">{liveOrdre || '—'}</span>
                    </div>
                </div>

                {/* ---------- The rail ---------- */}
                <div className="flex-1 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                        <GripHorizontal className="w-3.5 h-3.5 text-[#A30026]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            Ligne principale — glissez pour réordonner
                        </span>
                    </div>

                    {elements.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-dashed border-[#A30026]/30 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-[#A30026]/50" />
                            </div>
                            <p className="text-sm font-bold text-gray-600">Liaison vide</p>
                            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                                Cliquez un outil dans la barre latérale pour l'ajouter à la suite.
                                Seul l'ordre de gauche à droite compte.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center">
                            <div className="inline-flex items-start px-8 py-6 min-w-full">
                                {elements.map((el, idx) => {
                                    const isSelected = el.id === selectedElementId;
                                    const isDragging = dragIndex === idx;

                                    return (
                                        <React.Fragment key={el.id}>
                                            {idx > 0 && (
                                                <div
                                                    className="h-[3px] w-8 shrink-0 rounded-full bg-[#A30026]/25"
                                                    style={{ marginTop: CONNECTOR_OFFSET }}
                                                />
                                            )}

                                            <div
                                                onMouseDown={() => handleCardMouseDown(idx, el.id)}
                                                onMouseEnter={() => handleCardMouseEnter(idx)}
                                                className={`
                                                    group relative w-32 shrink-0 rounded-2xl border bg-white p-3 select-none
                                                    transition-all duration-150 cursor-grab active:cursor-grabbing
                                                    ${isDragging
                                                        ? 'opacity-40 scale-95 border-[#A30026] shadow-inner'
                                                        : isSelected
                                                            ? 'border-[#A30026] ring-2 ring-[#A30026]/30 shadow-lg -translate-y-1'
                                                            : 'border-gray-200 hover:border-[#A30026]/40 hover:shadow-md hover:-translate-y-0.5'}
                                                `}
                                            >
                                                {/* Rank badge — the rank IS the persisted order */}
                                                <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white ${isSelected ? 'bg-[#A30026] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                    {idx + 1}
                                                </span>

                                                <div className="h-24 flex items-center justify-center pointer-events-none">
                                                    <img
                                                        src={getAsset(el.type, el.subtype)}
                                                        alt={el.subtype ?? el.type}
                                                        className={`max-h-full max-w-full object-contain drop-shadow transition-transform ${el.orientation === 'right' ? '-scale-x-100' : ''}`}
                                                    />
                                                </div>

                                                <p className={`mt-1 h-8 text-center text-[11px] font-semibold leading-tight line-clamp-2 ${el.label ? 'text-gray-700' : 'text-gray-300 italic font-normal'}`}>
                                                    {el.label || 'sans repère'}
                                                </p>

                                                {/* Per-card actions */}
                                                <div className={`flex items-center justify-center gap-0.5 mt-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => moveElement(idx, idx - 1)}
                                                        disabled={idx === 0}
                                                        title="Décaler à gauche"
                                                        className="p-1 rounded-md text-gray-400 hover:text-[#A30026] hover:bg-red-50 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                    >
                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => handleFlip(el.id)}
                                                        title="Inverser le sens (miroir)"
                                                        className="p-1 rounded-md text-gray-400 hover:text-[#A30026] hover:bg-red-50"
                                                    >
                                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => handleDeleteElement(el.id)}
                                                        title="Supprimer l'élément"
                                                        className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#A30026]"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => moveElement(idx, idx + 1)}
                                                        disabled={idx === elements.length - 1}
                                                        title="Décaler à droite"
                                                        className="p-1 rounded-md text-gray-400 hover:text-[#A30026] hover:bg-red-50 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                    >
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Selected element — label editor */}
                    {selectedElement && (
                        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3 flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[#A30026] shrink-0">
                                <Tag className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                                    Repère n°{selectedIndex + 1}
                                </span>
                            </div>
                            <input
                                type="text"
                                value={selectedElement.label ?? ''}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                placeholder="Ex: Transfo, Pylone..."
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A30026]/40 focus:border-[#A30026]"
                            />
                            <button
                                onClick={() => setSelectedElementId(null)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
                                title="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- Help ---------- */}
            {showHelp && (
                <div className="absolute bottom-6 right-6 max-w-sm bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-gray-200 text-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-[#A30026] text-base flex items-center gap-2">
                            <HelpCircle size={16} />
                            Guide rapide
                        </h4>
                        <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-1 rounded-full transition-colors"><X size={14} /></button>
                    </div>
                    <ul className="space-y-2.5 text-gray-600 text-[11px]">
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">AJOUTER</span>
                            <span>Cliquer un outil l'ajoute à la fin de la liaison active</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">ORDRE</span>
                            <span>Glisser une carte sur sa voisine, ou utiliser ◀ ▶, pour la réordonner</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">REPÈRE</span>
                            <span>Sélectionner une carte pour saisir son texte (ex : Transfo LSA)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">LIAISON</span>
                            <span>Gérer plusieurs liaisons via les onglets en haut</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-green-50 border border-green-500 text-green-700 px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">ORDRE</span>
                            <span>Seul l'ordre gauche→droite est enregistré : aucune position à régler</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SchemaEditor;
