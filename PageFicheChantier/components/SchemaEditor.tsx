import React, { useState, useRef } from 'react';
import { Download, ArrowLeft, Trash2, Hash, HelpCircle, X, Move } from 'lucide-react';
import { SchemaElement, SchemaTool } from '../types';

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
    onBack: () => void;
    onSave: (elements: SchemaElement[]) => void;
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({ onBack, onSave }) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [elements, setElements] = useState<SchemaElement[]>([]);

    // UI State
    const [showHelp, setShowHelp] = useState(true);

    // Tool drag-and-drop creation state
    const [draggingTool, setDraggingTool] = useState<SchemaTool | null>(null);
    const [isDraggingNewTool, setIsDraggingNewTool] = useState(false);
    const [toolDragPos, setToolDragPos] = useState({ x: 0, y: 0 });

    // Canvas element manipulation state
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);

    // Click-to-place mode
    const [selectedTool, setSelectedTool] = useState<SchemaTool | null>(null);

    // Double-click detection
    const [lastClickTime, setLastClickTime] = useState<{ id: string; time: number } | null>(null);

    const TOOLS: SchemaTool[] = [
        { id: 't-simple', type: 'termination', subtype: 'simple', label: 'Extrémité' },
        { id: 't-nzo', type: 'termination', subtype: 'nzo', label: 'ZnO' },
        { id: 't-droite', type: 'termination', subtype: 'droite_directe', label: 'D.Directe' },
        { id: 'j-simple', type: 'joint', subtype: 'simple', label: 'Jonction' },
        { id: 'j-malt', type: 'joint', subtype: 'malt', label: 'Jct Malt' },
        { id: 'j-arret', type: 'joint', subtype: 'arret_ecran', label: 'Jct Arrêt' },
    ];

    const GRID = 20;
    const BASELINE_Y = 300; // Moved down for better centering
    const SNAP_THRESHOLD = 30; // Magnetic snap distance

    const snapToGrid = (val: number) => Math.round(val / GRID) * GRID;

    // 🔥 NEW: Intelligent snap-to-grid with magnetism
    const snapToGridAndElements = (rawX: number, rawY: number, excludeId?: string) => {
        let x = snapToGrid(rawX);
        let y = snapToGrid(rawY);

        // 1. Magnetic snap to baseline
        if (Math.abs(y - BASELINE_Y) < SNAP_THRESHOLD) {
            y = BASELINE_Y;
        }

        // 2. Magnetic snap to other elements (alignment)
        elements.forEach(el => {
            if (el.id === excludeId) return; // Skip the element being dragged

            // Vertical alignment (same X)
            if (Math.abs(x - el.x) < SNAP_THRESHOLD) {
                x = el.x;
            }

            // Horizontal alignment (same Y)
            if (Math.abs(y - el.y) < SNAP_THRESHOLD) {
                y = el.y;
            }
        });

        return { x, y };
    };

    // --- Asset Mapping ---
    const getAsset = (type: string, subtype?: string) => {
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

    // --- Handlers ---

    // 🔥 REMOVED: All HTML5 drag & drop handlers for Power Platform compatibility
    // No more: draggable, onDragStart, onDragEnd, onDrop, onDragOver

    // Custom mouse-based drag for tools (Power Platform compatible)
    const handleToolMouseDown = (e: React.MouseEvent, tool: SchemaTool) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingTool(tool);
        setIsDraggingNewTool(true);
        setToolDragPos({ x: e.clientX, y: e.clientY });
    };

    // Click-to-place handler
    const handleToolClick = (tool: SchemaTool) => {
        setSelectedTool(prev => prev?.id === tool.id ? null : tool);
        setSelectedElementId(null);
    };

    // Canvas click handler for placing selected tool
    const handleCanvasClick = (e: React.MouseEvent) => {
        // If clicking on an element, don't place a new one
        if ((e.target as HTMLElement).closest('g[data-element]')) {
            return;
        }

        // Deselect element if clicking on empty canvas
        if (!selectedTool) {
            setSelectedElementId(null);
        }

        // If a tool is selected, place it
        if (selectedTool && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;

            const { x, y } = snapToGridAndElements(rawX, rawY);

            const newElement: SchemaElement = {
                id: Date.now().toString(),
                type: selectedTool.type,
                x,
                y,
                orientation: 'left',
                subtype: selectedTool.subtype as any
            } as SchemaElement;

            setElements(prev => [...prev, newElement]);
        }
    };

    // 🔥 IMPROVED: Element mouse down with double-click detection
    const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Double-click detection
        const now = Date.now();
        if (lastClickTime && lastClickTime.id === id && now - lastClickTime.time < 300) {
            // Double-click detected - flip orientation
            handleFlipOrientation(id);
            setLastClickTime(null);
            return; // Don't start drag on double-click
        }
        setLastClickTime({ id, time: now });

        // Start drag
        setSelectedElementId(id);
        setIsDraggingElement(true);
        setDraggingElementId(id);
        setHasMoved(false);
        setDragStartPos({ x: e.clientX, y: e.clientY });

        const el = elements.find(E => E.id === id);
        if (el) {
            setElementStartPos({ x: el.x, y: el.y });
        }
    };

    // 🔥 NEW: Flip orientation handler
    const handleFlipOrientation = (elementId: string) => {
        setElements(prev => prev.map(el => {
            if (el.id === elementId && el.type === 'termination') {
                return {
                    ...el,
                    orientation: el.orientation === 'left' ? 'right' : 'left'
                };
            }
            return el;
        }));
    };

    // 🔥 IMPROVED: Mouse move with better snap logic
    const handleMouseMove = (e: React.MouseEvent) => {
        // Handle tool drag
        if (isDraggingNewTool) {
            setToolDragPos({ x: e.clientX, y: e.clientY });
        }

        // Handle element drag
        if (isDraggingElement && selectedElementId) {
            const dx = e.clientX - dragStartPos.x;
            const dy = e.clientY - dragStartPos.y;

            // Check if moved significantly
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                setHasMoved(true);
            }

            const newRawX = elementStartPos.x + dx;
            const newRawY = elementStartPos.y + dy;

            const { x, y } = snapToGridAndElements(newRawX, newRawY, selectedElementId);

            setElements(prev => prev.map(el =>
                el.id === selectedElementId ? { ...el, x, y } : el
            ));
        }
    };

    // 🔥 IMPROVED: Mouse up with tool placement
    const handleMouseUp = (e: React.MouseEvent) => {
        // Handle new tool placement
        if (isDraggingNewTool && draggingTool && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;

            // Only place if mouse is over the canvas
            if (rawX >= 0 && rawY >= 0 && rawX <= rect.width && rawY <= rect.height) {
                const { x, y } = snapToGridAndElements(rawX, rawY);

                const newElement: SchemaElement = {
                    id: Date.now().toString(),
                    type: draggingTool.type,
                    x,
                    y,
                    orientation: 'left',
                    subtype: draggingTool.subtype as any
                } as SchemaElement;

                setElements(prev => [...prev, newElement]);
            }
        }

        // Reset drag states
        setIsDraggingNewTool(false);
        setDraggingTool(null);
        setIsDraggingElement(false);
        setDraggingElementId(null);
        setHasMoved(false);
    };

    const handleDelete = () => {
        if (selectedElementId) {
            setElements(prev => prev.filter(e => e.id !== selectedElementId));
            setSelectedElementId(null);
        }
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-[9999] flex bg-gray-50 overflow-hidden font-sans"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* 🔥 NEW: Left Sidebar Toolbar */}
            <div className="w-28 bg-white border-r border-gray-200 flex flex-col shadow-lg z-50">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Outils</h3>
                </div>

                {/* Tools */}
                <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto">
                    {TOOLS.map((tool) => {
                        const isActive = draggingTool?.id === tool.id || selectedTool?.id === tool.id;
                        const assetSrc = getAsset(tool.type, tool.subtype as any);

                        return (
                            <div
                                key={tool.id}
                                className="group relative"
                                onMouseDown={(e) => handleToolMouseDown(e, tool)}
                                onClick={() => handleToolClick(tool)}
                            >
                                <div
                                    className={`
                                        relative flex flex-col items-center justify-center w-full aspect-square rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200
                                        ${isActive ? 'bg-red-50 ring-2 ring-[#A30026] ring-offset-2 scale-105 shadow-lg' : 'hover:bg-gray-50 hover:shadow-md border border-gray-200 hover:border-[#A30026]/30'}
                                    `}
                                >
                                    <div className="w-12 h-12 flex items-center justify-center mb-1">
                                        {assetSrc ? (
                                            <img src={assetSrc} alt={tool.label} className="w-full h-full object-contain pointer-events-none select-none" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-[#A30026]/10 flex items-center justify-center text-[#A30026]">
                                                <span className="font-bold text-xs">{tool.label.substring(0, 2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider text-center px-1 leading-tight ${isActive ? 'text-[#A30026]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                        {tool.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-gray-200 space-y-2">
                    <button
                        onClick={handleDelete}
                        disabled={!selectedElementId}
                        className={`w-full p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${selectedElementId
                            ? 'text-white bg-[#A30026] hover:bg-[#8a0020] shadow-lg'
                            : 'text-gray-300 bg-gray-100 cursor-not-allowed'
                            }`}
                        title="Supprimer la sélection"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Suppr</span>
                    </button>

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
                        onClick={() => onSave(elements)}
                        className="w-full p-3 bg-[#A30026] text-white rounded-xl shadow-lg hover:bg-[#8a0020] active:scale-95 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-xs">Enregistrer</span>
                    </button>
                </div>
            </div>

            {/* 🔥 IMPROVED: Canvas Area - Centered and larger */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
                <div
                    ref={canvasRef}
                    className={`w-full h-full max-w-7xl bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden relative ${selectedTool ? 'cursor-cell' : 'cursor-crosshair'}`}
                    onClick={handleCanvasClick}
                >
                    <svg className="w-full h-full">
                        <defs>
                            <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1" fill="#e5e7eb" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Baseline */}
                        <line x1="0" y1={BASELINE_Y} x2="100%" y2={BASELINE_Y} stroke="#A30026" strokeWidth="3" strokeDasharray="12,8" opacity="0.3" />
                        <text x="20" y={BASELINE_Y - 10} fill="#A30026" fontSize="11" className="select-none pointer-events-none opacity-50 uppercase tracking-[0.2em] font-bold">Ligne Principale</text>

                        {/* Elements */}
                        {elements.map(el => (
                            <g
                                key={el.id}
                                data-element="true"
                                transform={`translate(${el.x}, ${el.y})`}
                                onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                className={`cursor-move transition-opacity duration-200 ${draggingElementId === el.id ? 'opacity-50' : selectedElementId === el.id ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                            >
                                {/* Selection indicator */}
                                {selectedElementId === el.id && (
                                    <>
                                        <rect x="-55" y="-75" width="110" height="130" fill="#A30026" fillOpacity="0.08" stroke="#A30026" strokeWidth="3" strokeDasharray="6,6" rx="12" className="animate-pulse" />
                                        <circle cx="0" cy="-75" r="5" fill="#A30026" />
                                        <circle cx="0" cy="55" r="5" fill="#A30026" />
                                        <circle cx="-55" cy="0" r="5" fill="#A30026" />
                                        <circle cx="55" cy="0" r="5" fill="#A30026" />
                                    </>
                                )}

                                <g transform={el.orientation === 'right' ? 'scale(-1, 1)' : ''} className="filter drop-shadow-lg">
                                    <image
                                        href={getAsset(el.type, el.subtype)}
                                        x="-50" y="-50"
                                        width="100" height="100"
                                        preserveAspectRatio="xMidYMid meet"
                                    />
                                    {el.hasZ && el.subtype !== 'nzo' && (
                                        <g transform="translate(15, -40)">
                                            <circle r="12" fill="#A30026" stroke="white" strokeWidth="2" />
                                            <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">Z</text>
                                        </g>
                                    )}
                                </g>
                            </g>
                        ))}
                    </svg>

                    {/* Selected element indicator */}
                    {selectedElementId && (
                        <div className="absolute top-4 right-4 bg-[#A30026] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <Move className="w-4 h-4" />
                            <span className="text-xs font-bold">Élément sélectionné - Déplacez-le</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Help Overlay */}
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
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">GLISSER</span>
                            <span>Glisser un outil depuis la barre latérale vers le canvas</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">CLIC</span>
                            <span>Sélectionner un outil puis cliquer sur le canvas pour le placer</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">DÉPLACER</span>
                            <span>Cliquer et glisser un élément posé pour le repositionner</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-red-50 border border-[#A30026] text-[#A30026] px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">DBL-CLIC</span>
                            <span>Double-cliquer sur une extrémité pour inverser l'orientation</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-green-50 border border-green-500 text-green-700 px-1.5 py-0.5 rounded font-bold text-[9px] min-w-[55px] text-center tracking-wide">AIMANT</span>
                            <span>Les éléments s'alignent automatiquement sur la ligne et entre eux !</span>
                        </li>
                    </ul>
                </div>
            )}

            {/* Drag Ghost */}
            {isDraggingNewTool && draggingTool && (
                <div
                    className="fixed pointer-events-none z-[10000] opacity-80"
                    style={{
                        left: toolDragPos.x - 40,
                        top: toolDragPos.y - 40,
                    }}
                >
                    <div className="w-20 h-20 bg-white rounded-xl shadow-2xl border-3 border-[#A30026] flex items-center justify-center">
                        <img
                            src={getAsset(draggingTool.type, draggingTool.subtype)}
                            alt={draggingTool.label}
                            className="w-16 h-16 object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchemaEditor;
