
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IInputs } from "./generated/ManifestTypes";
import './css/input.css';

import { NAV_ITEMS, ProjectData, StepId, AppMode, mapSharePointDataToProjectData, mapProjectDataToSharePointData, AccessoryOption, CableOption, MonteurOption, RawProjectData, INITIAL_DATA, SchemaLiaison } from './types';
import { generateOrdreSchema, parseCurrentSchema, serializeCurrentSchema } from './schemaConstants';
import { Input, Select, TextArea, CableSelect, AccessoryList, BooleanCheckbox, MultiSelectCheckbox } from './components/Input';
import { SchemaEditor } from './components/SchemaEditor';
import { TablesEditor } from './components/TablesEditor';
import { WaitState } from './components/WaitState';
import { ConfidenceLegend } from './components/ConfidenceLegend';
import { FieldLevelContext, isAwaitingAi, isBlankValue, ConfidenceLevel } from './confidence';
import { mergeCctpIntoData, AI_FIELD_KEYS } from './merge';
import { Check, Upload, FileText, Calendar, ArrowRight, ArrowLeft, MessageSquare, X, Users, PenTool, DownloadCloud, AlertCircle, Eye, ClipboardEdit, Database, Cable, PenLine, Loader2, Monitor, Table2 } from 'lucide-react';


const CABLE_OPTIONS = [
  "Câble HTA 12/20kV 3x150mm² Alu",
  "Câble HTA 18/30kV 1x240mm² Cu",
  "Câble HTB 90kV 1x630mm² Alu",
  "Câble HTB 225kV 1x1200mm² Cu",
  "Câble BT 0.6/1kV 4x35mm² Cu"
];

const ACCESSORY_OPTIONS = [
  "Extrémité 90 kV extérieure synthétique autoporteuse - 630 mm² — Al",
  "Extrémité 90 kV extérieure synthétique autoporteuse - 1200 mm² — Al",
  "Extrémité 90 kV extérieure synthétique autoporteuse - 1200 mm² — Cu",
  "Extrémité 90 kV extérieure synthétique autoporteuse - 1600 mm² — Al",
  "Extrémité 90 kV extérieure synthétique autoporteuse - 1600 mm² — Cu",
  "Système auto-porteur pour extrémités 90 kV — Al",
  "Jonction isolée rubanée 90kV",
  "Prise d'écran pour câble HTB",
  "Boîte de jonction 24kV rétractable à froid",
  "Connecteur séparable équerre 630A"
];

export interface IAppProps {
  pcfContext?: ComponentFramework.Context<IInputs>;
  projectDataJson?: string;
  currentSchemaJson?: string;
  accessoriesOptionsJson?: string;
  cablesOptionsJson?: string;
  monteursOptionsJson?: string;
  /** JSON allégé (labels + tables) extrait du CCTP par AI Builder. */
  cctpJson?: string;
  onDataChange?: (newDataJson: string) => void;
  onSchemaChange?: (schemaJson: string) => void;
  onNavigate?: (target: string) => void;
  /** Émet le JSON d'une section de tableaux CCTP vers son output dédié. */
  onTablesChange?: (outputKey: string, json: string) => void;
}

export default function App(props: IAppProps) {
  const { pcfContext, projectDataJson, currentSchemaJson, accessoriesOptionsJson, cablesOptionsJson, monteursOptionsJson, cctpJson, onDataChange, onSchemaChange, onNavigate, onTablesChange } = props;

  // Parse options helper
  const parseOptionsOriginal = <T,>(json: string | undefined): T[] => {
    if (!json) return [];
    try {
      return JSON.parse(json) as T[];
    } catch (e) {
      console.error("Failed to parse options json", e);
      return [];
    }
  };

  const parseOptions = <T,>(json: string | undefined, mapper: (item: T) => string): string[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json) as T[];
      return parsed.map(mapper).filter(Boolean);
    } catch (e) {
      console.error("Failed to parse options json", e);
      return [];
    }
  };

  // Accessories Mapper Logic
  // Accessories Mapper Logic
  const accessoryMapper = (opt: AccessoryOption): string => {
    // 🟢 Updated Requirement: Use field_5 + Ame
    const part1 = opt.field_5 || opt.Title; // Fallback to Title if field_5 is missing
    const part2 = opt.Ame ? ` - ${opt.Ame}` : "";
    return (part1 + part2) || "";
  };

  const cableMapper = (opt: CableOption): string => {
    return [
      opt.Title,
      opt.Section,
      opt.Ame,
      opt.D_x00e9_tailssuppl_x00e9_mentair,
      opt._x00c2_me,
      opt.OData__x00c2_me
    ].filter(Boolean).join(" - ");
  };

  const [accessoriesList, setAccessoriesList] = useState<string[]>([]);
  const [fullAccessoriesList, setFullAccessoriesList] = useState<AccessoryOption[]>([]);

  const [cablesList, setCablesList] = useState<string[]>([]);
  const [fullCablesList, setFullCablesList] = useState<CableOption[]>([]);

  const [monteursList, setMonteursList] = useState<string[]>([]);
  const [fullMonteursList, setFullMonteursList] = useState<MonteurOption[]>([]);

  useEffect(() => {
    if (accessoriesOptionsJson) {
      // 🟢 Store Full Objects
      const parsed = parseOptionsOriginal<AccessoryOption>(accessoriesOptionsJson);
      console.log("Parsed Accessories (First 3):", parsed.slice(0, 3));
      console.log("Accessories have ID?", parsed.some(p => p.ID !== undefined || p.Id !== undefined));
      setFullAccessoriesList(parsed);
      // Map for UI
      setAccessoriesList(parsed.map(accessoryMapper).filter(Boolean));
    } else {
      setAccessoriesList(ACCESSORY_OPTIONS);
    }

    if (cablesOptionsJson) {
      // 🟢 Store Full Objects
      const parsed = parseOptionsOriginal<CableOption>(cablesOptionsJson);
      console.log("Parsed Cables (First 3):", parsed.slice(0, 3));
      console.log("Cables have ID?", parsed.some(p => p.ID !== undefined || p.Id !== undefined));
      setFullCablesList(parsed);
      // Map for UI
      setCablesList(parsed.map(cableMapper).filter(Boolean));
    } else {
      setCablesList(CABLE_OPTIONS);
    }

    if (monteursOptionsJson) {
      try {
        const parsed = JSON.parse(monteursOptionsJson) as MonteurOption[];
        setFullMonteursList(parsed);
        setMonteursList(parsed.map(m => m.Title));
      } catch (e) {
        console.error("Failed to parse monteurs options", e);
        setFullMonteursList([]);
        setMonteursList([]);
      }
    }
  }, [accessoriesOptionsJson, cablesOptionsJson, monteursOptionsJson]);

  // Parse initial data or use default
  const getInitialData = (): ProjectData => {
    if (projectDataJson) {
      try {
        const rawData = JSON.parse(projectDataJson);
        // Check if it's already in ProjectData format (legacy/dev) or SharePoint format
        if (rawData && ((rawData as RawProjectData).Title || (rawData as RawProjectData).Num_x00e9_roProjet)) {
          return mapSharePointDataToProjectData(rawData as RawProjectData);
        }
        return { ...INITIAL_DATA, ...(rawData || {}) } as ProjectData;
      } catch (e) {
        console.error("Failed to parse projectDataJson", e);
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  };

  // Parse initial liaisons from currentSchema (with legacy schemaData/ordreSchema fallback)
  const getInitialLiaisons = (): SchemaLiaison[] => {
    const initial = getInitialData();
    return parseCurrentSchema(currentSchemaJson || "", {
      schemaData: initial.schemaData,
      ordreSchema: initial.ordreSchema,
    });
  };

  const [appMode, setAppMode] = useState<AppMode>('landing');
  const [activeStep, setActiveStep] = useState<StepId>('general');
  // État initial = fusion SharePoint ⊕ CCTP (IA). Les niveaux de couleur par
  // champ sont calculés en même temps (cf. merge.ts).
  const [data, setData] = useState<ProjectData>(() => mergeCctpIntoData(getInitialData(), cctpJson).data);
  const [fieldLevels, setFieldLevels] = useState<Map<string, ConfidenceLevel>>(
    () => mergeCctpIntoData(getInitialData(), cctpJson).levels
  );
  const [liaisons, setLiaisons] = useState<SchemaLiaison[]>(getInitialLiaisons);

  // Sync incoming currentSchema changes from Power Apps
  useEffect(() => {
    const parsed = parseCurrentSchema(currentSchemaJson || "");
    if (parsed.length > 0) {
      setLiaisons(parsed);
    }
  }, [currentSchemaJson]);

  // Detect mobile portrait mode
  const rootRef = useRef<HTMLDivElement>(null);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const checkDevice = () => {
      setIsMobilePortrait(window.innerWidth < 500 && window.innerHeight >= window.innerWidth);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Track raw data to preserve unmapped SharePoint fields when broadcasting back
  const [rawSharePointData, setRawSharePointData] = useState<any>(null);

  // 🟢 FIX: Sync incoming data changes from PowerApps (e.g. Gallery selection change)
  // + fusion CCTP (IA). La règle d'or s'applique ici : SharePoint prime, l'IA ne
  // remplit que les champs vides. Se redéclenche quand le projet change OU quand
  // le JSON IA arrive après coup (~1 min de traitement).
  useEffect(() => {
    if (!projectDataJson) return;
    try {
      const rawData = JSON.parse(projectDataJson);

      // Save the raw unmapped payload so we don't lose any unused columns on 'Save'
      setRawSharePointData(Array.isArray(rawData) ? rawData[0] : rawData);

      const spData = (rawData && (rawData.Title || rawData.Num_x00e9_roProjet))
        ? mapSharePointDataToProjectData(rawData)
        : { ...INITIAL_DATA, ...(rawData || {}) } as ProjectData;

      const { data: merged, levels } = mergeCctpIntoData(spData, cctpJson);
      setFieldLevels(levels);

      setData(prev => {
        // Nouveau projet → on prend la fusion complète.
        if (merged.id !== prev.id || (!prev.id && merged.id)) {
          return merged;
        }
        // Même projet (ex. CCTP arrivé après coup) → on ne remplit QUE les
        // champs IA encore vides, sans écraser les saisies déjà présentes.
        let changed = false;
        const next: ProjectData = { ...prev };
        for (const key of AI_FIELD_KEYS) {
          if (
            isBlankValue(prev[key], { zeroIsBlank: true }) &&
            !isBlankValue(merged[key], { zeroIsBlank: true })
          ) {
            (next as unknown as Record<string, unknown>)[key as string] = merged[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    } catch (e) {
      console.error("Failed to parse incoming projectDataJson update", e);
    }
  }, [projectDataJson, cctpJson]);

  // Patch/Save state
  const [isSaving, setIsSaving] = useState(false);
  const [patchResult, setPatchResult] = useState<{ success: boolean, message?: string } | null>(null);

  // QHSE Navigation Modal State
  const [isQHSEModalOpen, setIsQHSEModalOpen] = useState(false);

  // Bypass de l'écran d'attente IA : l'utilisateur choisit de saisir
  // manuellement sans attendre le traitement du CCTP ("Je commence sans CCTP").
  const [skipWait, setSkipWait] = useState(false);

  // Le auto-broadcast a été supprimé pour éviter l'appel abusif à OnChange et les erreurs de timing.

  const isViewMode = appMode === 'view';

  const handleInputChange = (field: keyof ProjectData, value: any) => {
    if (isViewMode) return; // Prevent edits in view mode
    setData(prev => ({ ...prev, [field]: value }));
  };

  const currentStepIndex = NAV_ITEMS.findIndex(item => item.id === activeStep);
  const progress = Math.round(((currentStepIndex) / (NAV_ITEMS.length - 1)) * 100);

  const goToNext = () => {
    if (currentStepIndex < NAV_ITEMS.length - 1) {
      setActiveStep(NAV_ITEMS[currentStepIndex + 1].id);
    }
  };

  const goToPrev = () => {
    if (currentStepIndex > 0) {
      setActiveStep(NAV_ITEMS[currentStepIndex - 1].id);
    }
  };

  // Handle Save — Simple: map data, broadcast to Power Apps, navigate next
  const handleSave = () => {
    setIsSaving(true);
    setPatchResult(null);

    try {
      // Map current form data to SharePoint column format
      const mappedData = mapProjectDataToSharePointData(data, fullAccessoriesList, fullCablesList, fullMonteursList);
      const fullData = { ...(rawSharePointData || {}), ...mappedData };
      if (data.id) { fullData.ID = parseInt(data.id); fullData.id = data.id; }

      // Timestamp to force Power Apps to detect change
      fullData._triggerTime = Date.now();

      console.log("[App] Save → onDataChange:", fullData);
      if (onDataChange) {
        onDataChange(JSON.stringify(fullData));
      }

      setPatchResult({ success: true, message: 'Modifications transmises' });
      setTimeout(() => setPatchResult(null), 3000);

      // Navigate to next step
      goToNext();
    } catch (error) {
      console.error("[App] Save error:", error);
      setPatchResult({ success: false, message: 'Erreur inattendue' });
    } finally {
      setIsSaving(false);
    }
  };



  // Render different form content based on active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 'general':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Informations Générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Titre du projet"
                value={data.title}
                readOnly={isViewMode}
                onChange={e => handleInputChange('title', e.target.value)}
              />
              <Input
                label="Budget (€)"
                type="number"
                value={data.budget}
                readOnly={isViewMode}
                onChange={e => handleInputChange('budget', e.target.value)}
              />
              <TextArea
                label="Nature de l'opération"
                rows={3}
                value={data.operationNature}
                readOnly={isViewMode}
                onChange={e => handleInputChange('operationNature', e.target.value)}
              />
              <TextArea
                label="Spécificité Projet"
                rows={3}
                value={data.specificity}
                readOnly={isViewMode}
                onChange={e => handleInputChange('specificity', e.target.value)}
              />
              <Input
                label="Durée des travaux (semaines)"
                type="number"
                value={data.durationWeeks}
                readOnly={isViewMode}
                onChange={e => handleInputChange('durationWeeks', parseInt(e.target.value))}
              />
              <Input
                label="Effectif max présent"
                type="number"
                value={data.maxStaff}
                readOnly={isViewMode}
                onChange={e => handleInputChange('maxStaff', parseInt(e.target.value))}
              />
              <Input
                label="Date Début Intervention"
                type="date"
                value={data.startDate}
                readOnly={isViewMode}
                onChange={e => handleInputChange('startDate', e.target.value)}
              />
              <Input
                label="Date Fin Intervention"
                type="date"
                value={data.endDate}
                readOnly={isViewMode}
                onChange={e => handleInputChange('endDate', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <Input
                label="Adresse Chantier"
                value={data.siteAddress}
                className={!isViewMode ? "bg-gray-50" : ""}
                readOnly={isViewMode}
                onChange={e => handleInputChange('siteAddress', e.target.value)}
              />
              <Input
                label="Date de création"
                value={data.creationDate}
                readOnly
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        );

      case 'cctp':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">CCTP & Documents</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="CCTP Ref" value={data.cctpRef} readOnly={isViewMode} onChange={e => handleInputChange('cctpRef', e.target.value)} />
              <Input label="Numéro Commande client" value={data.clientOrderNumber} readOnly={isViewMode} onChange={e => handleInputChange('clientOrderNumber', e.target.value)} />
              <Input label="N°Marché" value={data.contractNumber} readOnly={isViewMode} onChange={e => handleInputChange('contractNumber', e.target.value)} />
              <Input label="Longueur (mètre)" value={data.length} readOnly={isViewMode} onChange={e => handleInputChange('length', e.target.value)} />
            </div>

            <Input label="Adresse Chantier" value={data.siteAddress} readOnly={isViewMode} onChange={e => handleInputChange('siteAddress', e.target.value)} isTextArea rows={3} />

            {/* Technical specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <Input label="Nombre Liaison" value={data.nombreLiaison} readOnly={isViewMode} onChange={e => handleInputChange('nombreLiaison', e.target.value)} />
              <Input label="Nombre Jonction" value={data.nombreJonction} readOnly={isViewMode} onChange={e => handleInputChange('nombreJonction', e.target.value)} />
              <Input label="Décret" value={data.decret} readOnly={isViewMode} onChange={e => handleInputChange('decret', e.target.value)} />
              <Input label="Jonction de puissance" value={data.jonctionPuissance} readOnly={isViewMode} onChange={e => handleInputChange('jonctionPuissance', e.target.value)} />
              <Input label="Tension" value={data.tension} readOnly={isViewMode} onChange={e => handleInputChange('tension', e.target.value)} />
              <Input label="Type de Malt" value={data.typeMalt} readOnly={isViewMode} onChange={e => handleInputChange('typeMalt', e.target.value)} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <Input label="Trimestre réalisation" type="date" value={data.trimestreRealisation} readOnly={isViewMode} onChange={e => handleInputChange('trimestreRealisation', e.target.value)} />
              <Input label="MADU" type="date" value={data.madu} readOnly={isViewMode} onChange={e => handleInputChange('madu', e.target.value)} />
            </div>
          </div>
        );


      case 'work_info':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Info Travaux</h3>

            {/* Cable Selection */}
            <div className="space-y-2 pt-4">
              <CableSelect
                label="Type de Câble"
                values={data.cables}
                onChange={(vals) => handleInputChange('cables', vals)}
                options={cablesList}
                readOnly={isViewMode}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[300px]">
              {/* Accessories */}
              <AccessoryList
                label="Accessoires"
                selectedItems={data.accessories}
                onChange={(val) => handleInputChange('accessories', val)}
                options={accessoriesList}
                readOnly={isViewMode}
              />

              {/* Test Duration & Consignation */}
              <div className="flex flex-col gap-6">
                <Input
                  label="Durée des essais (jours)"
                  type="number"
                  value={data.testDuration}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('testDuration', e.target.value)}
                />
                <Input
                  label="Date de Consignation"
                  type="date"
                  value={data.dateConsignation}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('dateConsignation', e.target.value)}
                />
                <Input
                  label="Date de Fin de consignation"
                  type="date"
                  value={data.dateFinConsignation}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('dateFinConsignation', e.target.value)}
                />
              </div>
            </div>

            {/* New Travaux fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <Input label="tores" value={data.tores} readOnly={isViewMode} onChange={e => handleInputChange('tores', e.target.value)} />
              <Input label="Circuit" value={data.circuit} readOnly={isViewMode} onChange={e => handleInputChange('circuit', e.target.value)} />
              <Input label="Extrémité Poste" value={data.extremitePoste} readOnly={isViewMode} onChange={e => handleInputChange('extremitePoste', e.target.value)} />
              <Input label="Phénomène d'induction" value={data.phenomeneInduction} readOnly={isViewMode} onChange={e => handleInputChange('phenomeneInduction', e.target.value)} />
            </div>
          </div>
        );

      case 'client_info':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Renseignement Client</h3>

            {/* GDP / GMR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="GDP" value={data.gdp} readOnly={isViewMode} onChange={e => handleInputChange('gdp', e.target.value)} />
              <Input label="GMR" value={data.gmr} readOnly={isViewMode} onChange={e => handleInputChange('gmr', e.target.value)} />
            </div>

            {/* PM Client */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <Input label="Nom Pm Client" value={data.pmClient} readOnly={isViewMode} onChange={e => handleInputChange('pmClient', e.target.value)} />
              <Input label="Tel Pm Client" value={data.telPmClient} readOnly={isViewMode} onChange={e => handleInputChange('telPmClient', e.target.value)} />
              <Input label="Mail Pm Client" value={data.mailPmClient} readOnly={isViewMode} onChange={e => handleInputChange('mailPmClient', e.target.value)} />
            </div>

            {/* Chargé Travaux Client */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <Input label="Chargé travaux Client" value={data.clientWorkManager} readOnly={isViewMode} onChange={e => handleInputChange('clientWorkManager', e.target.value)} />
              <Input label="Tel Chargé de travaux Nexans" value={data.telClientWorkManager} readOnly={isViewMode} onChange={e => handleInputChange('telClientWorkManager', e.target.value)} />
              <Input label="Mail Chargé travaux Client" value={data.mailClientWorkManager} readOnly={isViewMode} onChange={e => handleInputChange('mailClientWorkManager', e.target.value)} />
            </div>

            {/* Chargé Etude Client */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <Input label="Nom Chargé étude Client" value={data.clientStudyManager} readOnly={isViewMode} onChange={e => handleInputChange('clientStudyManager', e.target.value)} />
              <Input label="Tel Chargé étude Client" value={data.telClientStudyManager} readOnly={isViewMode} onChange={e => handleInputChange('telClientStudyManager', e.target.value)} />
              <Input label="Mail Chargé étude Client" value={data.mailClientStudyManager} readOnly={isViewMode} onChange={e => handleInputChange('mailClientStudyManager', e.target.value)} />
            </div>

            {/* QHSE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <Input label="QHSE Client" value={data.qhseClient} readOnly={isViewMode} onChange={e => handleInputChange('qhseClient', e.target.value)} />
              <Input label="Tel QHSE Client" value={data.telQhseClient} readOnly={isViewMode} onChange={e => handleInputChange('telQhseClient', e.target.value)} />
              <Input label="Mail QHSE Client" value={data.mailQhseClient} readOnly={isViewMode} onChange={e => handleInputChange('mailQhseClient', e.target.value)} />
            </div>

            {/* Other Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <Input label="Contact Responsable de projet DI Client" value={data.contactProjectManager} readOnly={isViewMode} onChange={e => handleInputChange('contactProjectManager', e.target.value)} />
              <Input label="Contact Assistant de contrôle Client" value={data.contactAssistantControl} readOnly={isViewMode} onChange={e => handleInputChange('contactAssistantControl', e.target.value)} />
              <Input label="Contact Assistant d'étude Client" value={data.contactAssistantStudy} readOnly={isViewMode} onChange={e => handleInputChange('contactAssistantStudy', e.target.value)} />
            </div>


            {/* Subcontractor Toggle */}
            <div className="flex items-center space-x-2 pt-6 border-t">
              <input
                type="checkbox"
                id="subcontractor"
                checked={data.hasSubcontractor}
                onChange={e => handleInputChange('hasSubcontractor', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#A30026] focus:ring-[#A30026]"
                disabled={isViewMode}
              />
              <label htmlFor="subcontractor" className="font-medium text-gray-700 text-[#A30026]">Sous Traitant</label>
            </div>

            {/* Subcontractor Fields */}
            {data.hasSubcontractor && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300 bg-red-50 p-4 rounded-lg">
                <Input label="Pm Sous Traitant" value={data.subcontractorPmName} readOnly={isViewMode} onChange={e => handleInputChange('subcontractorPmName', e.target.value)} />
                <Input label="Tel Pm Sous traitant" value={data.subcontractorPmPhone} readOnly={isViewMode} onChange={e => handleInputChange('subcontractorPmPhone', e.target.value)} />
                <Input label="Mail Pm Sous Traitant" value={data.subcontractorPmEmail} readOnly={isViewMode} onChange={e => handleInputChange('subcontractorPmEmail', e.target.value)} />
              </div>
            )}

          </div>
        );

      case 'nexans_info':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Renseignement Nexans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Charge travaux Nexans"
                value={data.workManagerName}
                options={monteursList}
                readOnly={isViewMode}
                onChange={e => {
                  const selectedName = e.target.value;
                  const selectedMonteur = fullMonteursList.find(m => m.Title === selectedName);

                  // Update Name
                  handleInputChange('workManagerName', selectedName);

                  // Update Phone & Email if found
                  // Update Phone & Email if found
                  if (selectedMonteur) {
                    handleInputChange('workManagerPhone', selectedMonteur.field_1 || "");
                    handleInputChange('workManagerEmail', selectedMonteur.field_2 || "");
                  }
                }}
              />
              <Input
                label="Tel Chargé de travaux Nexans"
                value={data.workManagerPhone}
                readOnly={isViewMode}
                onChange={e => handleInputChange('workManagerPhone', e.target.value)}
              />
              <Input
                label="Mail chargé Travaux Nexans"
                value={data.workManagerEmail}
                readOnly={isViewMode}
                onChange={e => handleInputChange('workManagerEmail', e.target.value)}
              />
              <Input
                label="Adresse Nexans"
                value={data.nexansAddress}
                readOnly={isViewMode}
                onChange={e => handleInputChange('nexansAddress', e.target.value)}
              />
              <Input
                label="France Sales & Installation Manager Nexans"
                value={data.salesManager}
                readOnly={isViewMode}
                onChange={e => handleInputChange('salesManager', e.target.value)}
              />
              <Input
                label="Nom Formation Nexans"
                value={data.trainingName}
                readOnly={isViewMode}
                onChange={e => handleInputChange('trainingName', e.target.value)}
              />
              <Input
                label="Nom Directeur Execution de projets Nexans"
                value={data.directorExecution}
                readOnly={isViewMode}
                onChange={e => handleInputChange('directorExecution', e.target.value)}
              />
              <Input
                label="Nom Ingénierie Câble Nexans"
                value={data.engineeringCable}
                readOnly={isViewMode}
                onChange={e => handleInputChange('engineeringCable', e.target.value)}
              />
              <Input
                label="Nom Responsable logistique Chantiers Nexans"
                value={data.logisticsManager}
                readOnly={isViewMode}
                onChange={e => handleInputChange('logisticsManager', e.target.value)}
              />
              <Input
                label="Nom Responsable QSHE Chantiers Nexans"
                value={data.qsheManager}
                readOnly={isViewMode}
                onChange={e => handleInputChange('qsheManager', e.target.value)}
              />
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Documents Qualité</h3>

            {/* Document Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-lg">
              <BooleanCheckbox
                label="PPSPS"
                value={data.ppsps}
                onChange={(value) => handleInputChange('ppsps', value)}
                readOnly={isViewMode}
              />
              <BooleanCheckbox
                label="PAQ"
                value={data.paq}
                onChange={(value) => handleInputChange('paq', value)}
                readOnly={isViewMode}
              />
              <BooleanCheckbox
                label="PPE"
                value={data.ppe}
                onChange={(value) => handleInputChange('ppe', value)}
                readOnly={isViewMode}
              />
            </div>

            {/* Document References */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="PAQ/PPSPS PPE Rédacteur"
                value={data.pmNexans}
                readOnly={true}
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Additional Document Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Adresse Base Vie"
                value={data.adresseBaseVie}
                readOnly={isViewMode}
                onChange={e => handleInputChange('adresseBaseVie', e.target.value)}
              />
              <Input
                label="Horaires"
                value={data.horaires}
                readOnly={isViewMode}
                onChange={e => handleInputChange('horaires', e.target.value)}
                isTextArea
                rows={3}
              />
            </div>
          </div>
        );

      case 'external_orgs':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Organismes Externes</h3>

            {/* Inspection du Travail */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Inspection du Travail</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Adresse"
                  value={data.inspectionTravailAddress}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('inspectionTravailAddress', e.target.value)}
                />
                <Input
                  label="Téléphone"
                  value={data.inspectionTravailPhone}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('inspectionTravailPhone', e.target.value)}
                />
                <Input
                  label="Email"
                  value={data.inspectionTravailMail}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('inspectionTravailMail', e.target.value)}
                />
              </div>
            </div>

            {/* Coordinateur SPS */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Coordinateur SPS</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nom"
                  value={data.coordinateurSps}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('coordinateurSps', e.target.value)}
                />
                <Input
                  label="Téléphone"
                  value={data.telCoordinateurSps}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('telCoordinateurSps', e.target.value)}
                />
                <Input
                  label="Email"
                  value={data.mailCoordinateurSps}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('mailCoordinateurSps', e.target.value)}
                />
              </div>
            </div>

            {/* Waste Management */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Gestion des Déchets</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom Correspondant Déchet"
                  value={data.nomCorrespondantDechet}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('nomCorrespondantDechet', e.target.value)}
                />
                <Input
                  label="Email Correspondant Déchet"
                  value={data.mailCorrespondantDechet}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('mailCorrespondantDechet', e.target.value)}
                />
              </div>
            </div>

            {/* GC Commander */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Commandant GC</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nom"
                  value={data.cdtGc}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('cdtGc', e.target.value)}
                />
                <Input
                  label="Téléphone"
                  value={data.telCdtGc}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('telCdtGc', e.target.value)}
                />
                <Input
                  label="Email"
                  value={data.mailCdtGc}
                  readOnly={isViewMode}
                  onChange={e => handleInputChange('mailCdtGc', e.target.value)}
                />
              </div>
            </div>

            {/* Other Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Effectif Sous-Traitant"
                value={data.effectifSousTraitant}
                readOnly={isViewMode}
                onChange={e => handleInputChange('effectifSousTraitant', e.target.value)}
              />
              <Input
                label="Bureau Client"
                value={data.bureauClient}
                readOnly={isViewMode}
                onChange={e => handleInputChange('bureauClient', e.target.value)}
              />
            </div>
          </div>
        );



      case 'pgc':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-[#A30026] border-b pb-2">Plan Général de Coordination (PGC)</h3>

            {/* Internal Roles */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Signataires Interne
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input readOnly={isViewMode} label="PAQ/PPSPS PPE Approbateur" value={data.approver} onChange={e => handleInputChange('approver', e.target.value)} />
                <Input readOnly={isViewMode} label="PAQ/PPSPS PPE Vérificateur" value={data.verifier} onChange={e => handleInputChange('verifier', e.target.value)} />
                <Input readOnly={true} className="bg-gray-100 text-gray-500 cursor-not-allowed" label="PAQ/PPSPS PPE Rédacteur" value={data.pmNexans} />
              </div>
            </div>

            {/* External Agencies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* OPPBTP */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-700 border-b pb-1">OPPBTP</h5>
                <Input readOnly={isViewMode} label="Adresse OPPBTP" value={data.oppbtpAddress} onChange={e => handleInputChange('oppbtpAddress', e.target.value)} />
                <Input readOnly={isViewMode} label="Tel OPPBTP" value={data.oppbtpPhone} onChange={e => handleInputChange('oppbtpPhone', e.target.value)} />
                <Input readOnly={isViewMode} label="Mail OPPBTP" value={data.oppbtpEmail} onChange={e => handleInputChange('oppbtpEmail', e.target.value)} />
              </div>

              {/* DREAL */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-700 border-b pb-1">DREAL</h5>
                <Input readOnly={isViewMode} label="Adresse DREAL" value={data.drealAddress} onChange={e => handleInputChange('drealAddress', e.target.value)} />
                <Input readOnly={isViewMode} label="Tel DREAL" value={data.drealPhone} onChange={e => handleInputChange('drealPhone', e.target.value)} />
                <Input readOnly={isViewMode} label="Mail DREAL" value={data.drealEmail} onChange={e => handleInputChange('drealEmail', e.target.value)} />
              </div>

              {/* CARSAT */}
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-700 border-b pb-1">CARSAT</h5>
                <Input readOnly={isViewMode} label="Adresse CARSAT" value={data.carsatAddress} onChange={e => handleInputChange('carsatAddress', e.target.value)} />
                <Input readOnly={isViewMode} label="Tel Carsat" value={data.carsatPhone} onChange={e => handleInputChange('carsatPhone', e.target.value)} />
                <Input readOnly={isViewMode} label="Mail Carsat" value={data.carsatEmail} onChange={e => handleInputChange('carsatEmail', e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 'resume':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-bold text-[#A30026]">Résumé du Projet</h3>
              <div className="text-xs text-gray-500">
                {isViewMode ? "Mode Lecture Seule" : "Veuillez vérifier les informations avant validation finale"}
              </div>
            </div>

            {/* Project Identity Header */}
            <div className="bg-gray-100 rounded-3xl p-6 text-center border border-gray-200 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">{data.title}</h2>
              <div className="text-xs text-gray-400 font-light tracking-widest uppercase">
                ID: {data.contractNumber || "Non défini"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Budget:</dt>
                      <dd className="font-bold text-gray-900">{data.budget} €</dd>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Début:</dt>
                      <dd className="font-bold text-gray-900">{data.startDate}</dd>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Fin:</dt>
                      <dd className="font-bold text-gray-900">{data.endDate}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="space-y-4 md:col-start-2">
                <h4 className="font-bold text-gray-900 bg-gray-200 p-3 rounded-lg">Info Travaux</h4>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Câbles:</dt>
                      <dd className="font-bold text-gray-900 text-right">
                        {data.cables.length > 0 ? (
                          <ul className="text-right">
                            {data.cables?.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        ) : "Non spécifié"}
                      </dd>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Durée Essais:</dt>
                      <dd className="font-bold text-gray-900">{data.testDuration} jours</dd>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <dt className="text-gray-500 font-medium">Accessoires:</dt>
                      <dd className="font-bold text-gray-900 text-right">
                        {data.accessories.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {data.accessories?.map((a, i) => (
                              <span key={i} className="">{a.split('-')[0].trim()}</span>
                            ))}
                          </div>
                        ) : "Aucun"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 bg-gray-200 p-3 rounded-lg">Nexans Contact</h4>
                <div className="space-y-2 text-sm px-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 font-medium">Chargé Travaux:</span>
                    <span className="font-bold text-gray-900">{data.workManagerName}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 font-medium">Sales Mgr:</span>
                    <span className="font-bold text-gray-900">{data.salesManager}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 bg-gray-200 p-3 rounded-lg">Client Contact</h4>
                <div className="space-y-2 text-sm px-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 font-medium">QHSE:</span>
                    <span className="font-bold text-gray-900">{data.qhseClient}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 font-medium">Tel:</span>
                    <span className="font-bold text-gray-900">{data.telQhseClient}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 font-medium">Projet DI:</span>
                    <span className="font-bold text-gray-900">{data.contactProjectManager}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );

      default:
        return <div className="p-12 text-center text-gray-500">Step content under construction</div>;
    }
  };

  // Handle Schema Save — persists the multi-liaison JSON via currentSchema output,
  // and keeps the legacy single-schema fields in sync (first liaison) for compat.
  const handleSchemaSave = (savedLiaisons: SchemaLiaison[]) => {
    setLiaisons(savedLiaisons);

    // Emit the multi-liaison JSON envelope (read later by other PCFs)
    if (onSchemaChange) {
      onSchemaChange(serializeCurrentSchema(savedLiaisons));
    }

    // Legacy backward-compat: mirror the first liaison into schemaData/ordreSchema
    const firstElements = savedLiaisons[0]?.elements ?? [];
    const ordreSchema = generateOrdreSchema(firstElements);
    const schemaData = JSON.stringify(firstElements);
    const newData = { ...data, schemaData, ordreSchema };
    setData(newData);

    if (onDataChange) {
      const mappedData = mapProjectDataToSharePointData(
        newData, fullAccessoriesList, fullCablesList, fullMonteursList
      );
      const fullData = { ...(rawSharePointData || {}), ...mappedData };
      if (newData.id) { fullData.ID = parseInt(newData.id); fullData.id = newData.id; }
      fullData._triggerTime = Date.now();
      onDataChange(JSON.stringify(fullData));
    }
  };

  // Wait-state : le flux AI Builder (~1 min) n'a pas encore produit le JSON.
  // On affiche l'écran "café ☕" tant qu'aucune donnée exploitable n'est reçue.
  if (isAwaitingAi(cctpJson) && !skipWait) {
    return <WaitState onSkip={() => setSkipWait(true)} />;
  }

  if (appMode === 'schema') {
    return <SchemaEditor initialLiaisons={liaisons} onBack={() => setAppMode('landing')} onSave={handleSchemaSave} />;
  }

  if (appMode === 'tables') {
    return (
      <TablesEditor
        cctpJson={cctpJson}
        onSaveSection={(outputKey, json) => onTablesChange?.(outputKey, json)}
        onBack={() => setAppMode('landing')}
      />
    );
  }

  // Mobile guard — screen too small
  if (isMobilePortrait) {
    return (
      <div ref={rootRef} className="absolute inset-0 flex items-center justify-center p-6" style={{ backgroundColor: '#88001f' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs text-center">
          <div className="bg-red-50 rounded-xl flex items-center justify-center mx-auto" style={{ width: '56px', height: '56px', marginBottom: '16px' }}>
            <Monitor className="text-[#A30026]" style={{ width: '28px', height: '28px' }} />
          </div>
          <h2 className="font-bold text-gray-900" style={{ fontSize: '16px', marginBottom: '8px' }}>Appareil non compatible</h2>
          <p className="text-gray-500 leading-relaxed" style={{ fontSize: '13px' }}>
            La création de fiche chantier doit s'effectuer sur tablette ou ordinateur. Veuillez utiliser un autre appareil.
          </p>
        </div>
      </div>
    );
  }

  // Landing Page Component
  if (appMode === 'landing') {
    return (
      <div ref={rootRef} className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 overflow-auto" style={{ backgroundColor: '#88001f' }}>
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[100px]"></div>
        </div>

        <div className="relative w-full max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-6 tracking-tight">
            Nexans <span className="font-light opacity-90">Project Manager</span>
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <button
              onClick={() => {
                setAppMode('view');
                setActiveStep('resume');
              }}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center border border-white/20 hover:border-white/50"
              style={{ padding: '20px 12px', minHeight: '160px' }}
            >
              <div className="bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-[#A30026] group-hover:text-white transition-colors duration-300 shadow-inner" style={{ width: '52px', height: '52px', marginBottom: '12px' }}>
                <Eye className="text-[#A30026] group-hover:text-white" style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '14px', marginBottom: '6px' }}>Voir Chantier</h2>
                <p className="text-gray-500 leading-relaxed" style={{ fontSize: '11px' }}>Consulter les détails du projet en lecture seule.</p>
              </div>
            </button>

            <button
              onClick={() => setAppMode('edit')}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center border border-white/20 hover:border-white/50"
              style={{ padding: '20px 12px', minHeight: '160px' }}
            >
              <div className="bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-[#A30026] group-hover:text-white transition-colors duration-300 shadow-inner" style={{ width: '52px', height: '52px', marginBottom: '12px' }}>
                <ClipboardEdit className="text-[#A30026] group-hover:text-white" style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '14px', marginBottom: '6px' }}>Créer / Modifier</h2>
                <p className="text-gray-500 leading-relaxed" style={{ fontSize: '11px' }}>Éditer les informations du chantier ou créer un nouveau projet.</p>
              </div>
            </button>

            <button
              onClick={() => setAppMode('schema')}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center border border-white/20 hover:border-white/50"
              style={{ padding: '20px 12px', minHeight: '160px' }}
            >
              <div className="bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-[#A30026] group-hover:text-white transition-colors duration-300 shadow-inner" style={{ width: '52px', height: '52px', marginBottom: '12px' }}>
                <PenLine className="text-[#A30026] group-hover:text-white" style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '14px', marginBottom: '6px' }}>Créer un Schéma</h2>
                <p className="text-gray-500 leading-relaxed" style={{ fontSize: '11px' }}>Schéma unifilaire par glisser-déposer.</p>
              </div>
            </button>

            <button
              onClick={() => setAppMode('tables')}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center border border-white/20 hover:border-white/50"
              style={{ padding: '20px 12px', minHeight: '160px' }}
            >
              <div className="bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-[#A30026] group-hover:text-white transition-colors duration-300 shadow-inner" style={{ width: '52px', height: '52px', marginBottom: '12px' }}>
                <Table2 className="text-[#A30026] group-hover:text-white" style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '14px', marginBottom: '6px' }}>Tableaux CCTP</h2>
                <p className="text-gray-500 leading-relaxed" style={{ fontSize: '11px' }}>Vérifier et corriger les tableaux extraits du CCTP.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div ref={rootRef} className="relative flex flex-col w-full h-full bg-gray-100 overflow-hidden font-sans">
      {/* Légende des couleurs de confiance — onglet Général uniquement */}
      {activeStep === 'general' && <ConfidenceLegend />}
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
            <span className="text-[#A30026]">Nexans</span>
            <span className="text-gray-300">|</span>
            <span className="truncate">{data.title || "Nouveau Projet"}</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {isViewMode && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200 whitespace-nowrap">
              Read Only
            </span>
          )}

          <button
            onClick={() => setAppMode('landing')}
            className="p-2 text-gray-400 hover:text-[#A30026] transition-colors rounded-full hover:bg-gray-100"
            title="Retour à l'accueil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Row: Form + Sidebar */}
      <div className="flex flex-1 overflow-hidden relative flex-row">

        {/* Background Decorative Element (Desktop Only) */}
        <div className="absolute top-0 right-0 w-1/3 h-64 z-0 pointer-events-none opacity-90 mask-image-gradient block">
          <img
            src="https://www.nexans.fr/.imaging/mte/nexans-theme/social_summary/dam/nexans-fr/banners/Compagny-pictures/Nexans_reel_activity.jpg/jcr:content/Nexans_reel_activity.jpg"
            alt="Industrial Cable"
            className="w-full h-full object-cover rounded-bl-[100px] shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#A30026]/40 to-transparent rounded-bl-[100px]"></div>
        </div>

        {/* Form Area - Order 2 on Mobile (below nav), Order 1 on Desktop */}
        <div className="flex-1 flex flex-col min-w-0 order-1 relative z-10 p-6">
          <div className="flex-1 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 flex flex-col overflow-hidden relative">
            {/* Progress Bar */}
            <div className="h-1 bg-gray-100 w-full flex-shrink-0">
              <div
                className="h-full bg-gradient-to-r from-[#A30026] to-[#ff4d4d] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <FieldLevelContext.Provider value={fieldLevels}>
                {renderStepContent()}
              </FieldLevelContext.Provider>
            </div>

            {/* Navigation Footer */}
            <div className="p-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center flex-shrink-0">
              <button
                onClick={goToPrev}
                disabled={currentStepIndex === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentStepIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>

              {/* Center: Save Button & Feedback */}
              <div className="flex items-center gap-3">
                {!isViewMode && (
                  <>
                    <button
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${isSaving
                        ? 'bg-gray-400 text-white cursor-wait'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200 hover:shadow-green-300'
                        }`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          <span>Enregistrer</span>
                        </>
                      )}
                    </button>

                    {/* Patch Result Feedback */}
                    {patchResult && (
                      <div
                        className={`px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-left-2 ${patchResult.success
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                      >
                        {patchResult.message}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Terminer on last step, or next in view mode */}
              {currentStepIndex === NAV_ITEMS.length - 1 ? (
                <button
                  className="flex items-center gap-2 px-6 py-2 bg-[#A30026] text-white rounded-lg hover:bg-[#85001f] transition-all shadow-lg shadow-red-200 hover:shadow-red-300 font-bold"
                  onClick={() => {
                    if (data.ppsps || data.paq || data.ppe) {
                      setIsQHSEModalOpen(true);
                    } else {
                      setAppMode('landing');
                    }
                  }}
                >
                  <Check className="w-4 h-4" />
                  <span>Terminer</span>
                </button>
              ) : isViewMode ? (
                <button
                  onClick={goToNext}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-lg hover:shadow-xl font-medium group"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sidebar Navigation - Order 1 on Mobile (Stepper), Order 2 on Desktop (Sidebar) */}
        <div className="w-80 bg-transparent border-none order-2 flex flex-col z-20 flex-shrink-0">

          {/* Desktop Vertical Nav */}
          <nav className="flex flex-col gap-3 p-6 sticky top-6">
            {NAV_ITEMS.map((item, index) => {
              const isActive = activeStep === item.id;
              const isCompleted = NAV_ITEMS.findIndex(i => i.id === activeStep) > index;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveStep(item.id)}
                  className={`relative flex items-center justify-between p-4 rounded-xl transition-all duration-300 w-full text-left group overflow-hidden ${isActive
                    ? 'bg-[#A30026] text-white shadow-xl shadow-red-900/20 scale-105'
                    : 'bg-white text-gray-600 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-3 z-10">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isCompleted && !isActive && <Check className="w-4 h-4 text-green-500" />}

                  {/* Active State Decoration */}
                  {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>}
                </button>
              );
            })}

            {/* Support Box (Desktop Only) */}
            <div className="mt-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Support</p>
                  <p className="text-sm font-bold">Besoin d&apos;aide ?</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Contactez le support IT pour toute question.
              </p>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

// Internal Confirmation Modal Component
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[#A30026]" />
          </div>

          <h3 className="text-xl font-bold text-gray-900">Documents QHSE détectés</h3>

          <p className="text-gray-600 leading-relaxed">
            Vous avez coché un des documents QHSE. Voulez-vous vous rediriger vers la page de génération ?
          </p>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Non
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-[#A30026] text-white rounded-xl font-bold hover:bg-[#85001f] transition-colors shadow-lg shadow-red-200"
            >
              Oui
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
