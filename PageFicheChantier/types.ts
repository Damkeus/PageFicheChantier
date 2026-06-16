

export type StepId =
    | 'general'
    | 'cctp'
    | 'work_info'
    | 'client_info'
    | 'nexans_info'
    | 'documents'
    | 'external_orgs'
    | 'pgc'
    | 'resume';

export type AppMode = 'landing' | 'view' | 'edit' | 'schema' | 'tables';

export interface SchemaElement {
    id: string;
    type: 'termination' | 'joint' | 'transformer' | 'generator' | 'other';
    subtype?: 'simple' | 'nzo' | 'droite_directe' | 'malt' | 'arret_ecran'; // Subtypes for different asset variants
    x: number;
    y: number;
    orientation?: 'left' | 'right'; // For terminations
    hasZ?: boolean; // For "NZO" / Z-mark toggle (optional)
    label?: string; // Free editable text displayed on the element card
}

// A "liaison" is one single-line diagram (schéma unifilaire).
// Several liaisons can be created and saved together.
export interface SchemaLiaison {
    id: string;
    comment: string; // Free comment for this liaison
    ordreSchema: string; // "1,4,5,1" — element type codes (1-6), reconstruction key
    elements: SchemaElement[]; // Full element data (incl. labels) for faithful rebuild
}

// Envelope serialized into the `currentSchema` property, read by other PCFs.
export interface CurrentSchema {
    version: number;
    liaisons: SchemaLiaison[];
}

export interface SchemaTool {
    id: string;
    type: SchemaElement['type'] | 'nzo';
    label: string;
    subtype?: string;
    iconPath?: string; // For eventually using the PNGs
}

export interface NavItem {
    id: StepId;
    label: string;
    subtype?: string;
}

export const NAV_ITEMS: NavItem[] = [
    { id: 'general', label: 'Général' },
    { id: 'cctp', label: 'CCTP' },
    { id: 'work_info', label: 'Travaux' },
    { id: 'client_info', label: 'Client' },
    { id: 'nexans_info', label: 'Nexans' },
    { id: 'documents', label: 'Documents' },
    { id: 'external_orgs', label: 'Organismes' },
    { id: 'pgc', label: 'PGC' },
    { id: 'resume', label: 'Résumé' }
];

export interface ProjectData {
    id?: string;
    title: string;
    operationNature: string;
    budget: string;
    specificity: string;
    durationWeeks: number;
    maxStaff: number;
    startDate: string;
    endDate: string;
    creationDate: string;
    contractNumber: string;
    projectUniqId: string;
    cctpRef: string;
    siteAddress: string;
    folderPath: string;

    // PM Nexans (Person field)
    pmNexans: string; // Display name
    pmNexansId?: number; // SharePoint lookup ID
    mailPmNexans: string;

    // Client name
    client: string;

    // Additional dates
    trimestreRealisation: string;
    madu: string; // Date MADU
    dateConsignation: string;
    dateFinConsignation: string;

    // Measurements
    length: string; // Longueur
    nombreLiaison: string;
    nombreJonction: string;

    // Work schedule
    horaires: string; // field_27

    // Type de travaux (multi-select)
    typesTravaux: string[]; // ["Sur pylône", "En poste"]

    // Client Info
    pmClient: string;
    telPmClient: string;
    mailPmClient: string;

    clientWorkManager: string;
    telClientWorkManager: string;
    mailClientWorkManager: string;

    clientStudyManager: string;
    telClientStudyManager: string;
    mailClientStudyManager: string;

    qhseClient: string;
    telQhseClient: string;
    mailQhseClient: string;

    // Additional client contacts
    contactProjectManager: string;
    contactAssistantControl: string;
    contactAssistantStudy: string;

    controleurTravauxClient: string;
    telControleurTravauxClient: string;
    mailControleurTravauxClient: string;

    bureauClient: string;

    // Nexans Info
    nexansAddress: string;
    workManagerName: string;
    workManagerId?: number; // SharePoint lookup ID for ChargetravauxNexans
    workManagerEmail: string;
    workManagerPhone: string;
    salesManager: string;
    salesManagerMail: string;
    salesManagerPhone: string;
    trainingName: string;
    trainingPhone: string;
    directorExecution: string;
    directorExecutionPhone: string;
    engineeringCable: string;
    engineeringCablePhone: string;
    responsableMethodeMontage: string;
    responsableMethodeMontagePhone: string;
    mailResponsableMethodeMontage: string;
    logisticsManager: string;
    logisticsManagerPhone: string;
    qsheManager: string;
    qsheManagerPhone: string;
    qsheManagerMail: string;
    medecin: string;
    medecinPhone: string;
    infirmier: string;
    infirmierPhone: string;
    respServiceInstall: string;
    telRespServiceInstall: string;
    mailRespServiceInstall: string;

    // Work Info
    cables: string[];
    accessories: string[];
    testDuration: string;
    clientOrderNumber: string;
    linkName: string;
    gdp: string;
    gmr: string;
    decret: string;
    jonctionPuissance: string;
    tension: string;

    // New Travaux fields
    tores: string;
    circuit: string;
    extremitePoste: string;
    phenomeneInduction: string;
    typeMalt: string;

    // Documents/Booleans
    ppsps: boolean;
    paq: boolean;
    ppe: boolean;

    // Document references
    paqPpspsReferenceRedacteur: string;
    nomenclatureNotice: string;

    // Additional work info
    adresseBaseVie: string;

    // Subcontractor
    hasSubcontractor: boolean;
    subcontractorPmName: string;
    subcontractorPmPhone: string;
    subcontractorPmEmail: string;

    // PGC Fields
    approver: string;
    verifier: string;
    writer: string;
    oppbtpAddress: string;
    oppbtpPhone: string;
    oppbtpEmail: string;
    drealAddress: string;
    drealPhone: string;
    drealEmail: string;
    carsatAddress: string;
    carsatPhone: string;
    carsatEmail: string;


    // Inspection du Travail
    inspectionTravailAddress: string;
    inspectionTravailPhone: string;
    inspectionTravailMail: string;

    // Waste management
    nomCorrespondantDechet: string;
    mailCorrespondantDechet: string;

    // GC Commander
    cdtGc: string;
    telCdtGc: string;
    mailCdtGc: string;

    // SPS Coordinator
    coordinateurSps: string;
    telCoordinateurSps: string;
    mailCoordinateurSps: string;

    // Effectif sous-traitant
    effectifSousTraitant: string;

    // Achat
    achat: string;

    // Statut du projet
    statut: string;

    // Schema
    schemaData: string; // JSON stringified SchemaElement[]
    ordreSchema: string; // "1,4,5,1" format - numeric IDs of elements left to right
}

// SharePoint Expanded Reference for Lookup/Person fields
export interface SPListExpandedReference {
    "@odata.type": string;
    Id: number;
    Value: string;
}

// SharePoint Expanded User for Author/Editor fields
export interface SPListExpandedUser {
    "@odata.type": string;
    Claims: string;
    DisplayName: string;
    Email: string;
    Picture: string;
    Department: string;
    JobTitle: string;
}

// Legacy interfaces (kept for compatibility)
export interface SharePointPerson {
    Id: number;
    Value: string;
}

export interface SharePointLookup {
    Id: number;
    Value: string;
}

export interface AccessoryOption {
    ID?: number;
    Id?: number;
    Title: string;
    field_5?: string;
    "Description Nexans France"?: string;
    "Désignation Nexans Suisse"?: string;
    Ame?: string;
}

export interface CableOption {
    ID?: number;
    Id?: number;
    Title: string;
    Section?: string;
    Ame?: string;
    D_x00e9_tailssuppl_x00e9_mentair?: string;
    Tension?: string;
    _x00c2_me?: string;
    OData__x00c2_me?: string;
}

export interface MonteurOption {
    Title: string;
    field_1?: string; // TEL
    field_2?: string; // EMAIL
}

export interface RawProjectData {
    // Core metadata
    "@odata.etag"?: string;
    ItemInternalId?: string;
    id?: string; // Support for PowerApps convenience
    ID?: number; // SharePoint ID

    // Basic project info
    Title: string;
    ProjectUniqID?: string;
    FolderPath?: string;

    // PM Nexans (Person lookup)
    PmNexans?: SPListExpandedReference;
    "PmNexans#Id"?: number;
    MailPMNexans?: string;

    // Client info
    Client?: string;

    // Dates
    field_2?: string; // Date (appears to be a date field)
    Num_x00e9_roProjet?: string;
    trimestrer_x00e9_alisation?: string;

    // Numbers & Measurements
    Longueur?: number | string;

    // Text fields (field_X series)
    field_4?: string;
    field_5?: string;
    field_6?: string; // Operation Nature
    field_7?: string;
    field_14?: string;
    field_15?: string;
    field_18?: string;
    field_28?: string;
    field_32?: string;
    field_33?: string;
    field_34?: string;
    field_37?: string;
    field_39?: string;
    field_41?: string;
    field_42?: string;
    field_43?: string;
    field_45?: string;
    field_47?: string;
    field_49?: string;
    field_57?: string;
    field_58?: string;
    field_60?: string;

    // Cable/Work info
    NombreLiaison?: string;
    field_16?: string; // Start Date
    field_17?: string; // End Date
    Dur_x00e9_eapproximative?: string;
    Dur_x00e9_edesessais?: string;

    // Type de travaux (Multi-select)
    Typedetravaux?: SPListExpandedReference[];
    "Typedetravaux@odata.type"?: string;
    "Typedetravaux#Id"?: number[];
    "Typedetravaux#Id@odata.type"?: string;

    field_26?: number;
    DatedeConsignation?: string;
    DatedeFindeconsignation?: string;
    field_27?: string; // Horaires

    // Documents
    PAQ_x002f_PPSPSPPER_x00e9_dacteu?: string;
    field_29?: string;
    field_30?: string;

    // Base de vie
    AdresseBaseVie?: string;

    // Client contacts
    TelPmClient?: string;
    MailPmClient?: string;
    NomCharg_x00e9__x00e9_tudeClient?: string;
    TelCharg_x00e9__x00e9_tudeClient?: string;
    MailCharg_x00e9__x00e9_tudeClien?: string;
    field_36?: string;
    Charg_x00e9_travauxClient?: string;
    MailCharg_x00e9_travauxClient?: string;
    ControleurTravauxClient?: string;
    TelControleurTravauxClient?: string;
    MailControleurTravauxClient?: string;
    field_38?: string;
    field_40?: string;

    // QHSE Client
    QHSEClient?: string;
    TelQHSEClient?: string;
    field_44?: string;
    field_46?: string;
    field_48?: string;

    // SPS Coordinator
    TelCoordonateurSPS?: string;
    MailCoordonateurSPS?: string;

    // Subcontractor
    PmSousTraitant?: string;
    field_50?: string;
    field_53?: string;
    field_54?: string;

    // Nexans contacts
    field_55?: string;
    MailFranceSalesInstallationManag?: string;
    field_56?: string;
    ChargetravauxNexans?: SPListExpandedReference;
    "ChargetravauxNexans#Id"?: number;
    Mailcharg_x00e9_TravauxNexans?: string;
    field_62?: string;
    field_61?: string;
    MailresponsableQSHENexans?: string;
    field_63?: string;
    field_65?: string;
    field_64?: string;
    field_66?: string;
    MailResponsableM_x00e9_thodemont?: string;
    field_67?: string;
    field_68?: string;
    field_69?: string;
    field_70?: string;
    field_71?: string;
    field_72?: string;
    field_73?: string;
    field_74?: string;
    Resp_ServiceInstal?: string;
    TelRespServiceInstall?: string;
    MailRespServiceInstall?: string;
    field_75?: string;
    field_76?: string;

    // Accessories (Multi-select)
    Accessoire?: SPListExpandedReference[];
    Cable?: SPListExpandedReference[];
    "Accessoire@odata.type"?: string;
    "Accessoire#Id"?: number[];
    "Accessoire#Id@odata.type"?: string;
    "Accessoire_x003a_ID"?: SPListExpandedReference[];
    "Accessoire_x003a_ID@odata.type"?: string;
    "Accessoire_x003a_ID#Id"?: number[];
    "Accessoire_x003a_ID#Id@odata.type"?: string;
    ListAccessoire?: string;

    // Technical specs
    NombreJonction?: string;
    GDP?: string;
    GMR?: string;
    D_x00e9_cret?: string;
    Jonctiondepuissance?: string;
    Tension?: string;

    // New Travaux fields
    tores?: string;
    Circuit?: string;
    Extr_x00e9_mit_x00e9_Poste?: string;
    Ph_x00e9_nom_x00e8_nedinduction?: string;
    TypedeMalt?: string;

    // Booleans
    PPSPS?: boolean;
    PAQ?: boolean;
    PPE?: boolean;

    // Budget & Dates
    Budget?: number | string;
    MADU?: string;
    CoordonateurSPS?: string;

    // Waste/Environment
    NomCorrespondantD_x00e9_chet?: string;
    MailCorrespondantD_x00e9_chet?: string;

    // External organizations
    Adresse_x0020_Inspection_x0020_T?: string;
    Tel_x0020_Inspection_x0020_du_x0?: string;
    Mail_x0020_Inspection_x0020_du_x?: string;
    Adresse_x0020_DREAL?: string;
    Tel_x0020_DREAL?: string;
    Mail_x0020_DREAL?: string;
    Adresse_x0020_CARSAT?: string;
    Tel_x0020_Carsat?: string;
    Mail_x0020_Carsat?: string;
    Adresse_x0020_OPPBTP?: string;
    Tel_x0020_OPPBTP?: string;

    // GC Commander
    Cdt_x0020_GC?: string;
    Tel_x0020_Cdt_x0020_GC?: string;
    Mail_x0020_Cdt_x0020_GC?: string;

    // Other
    Effectif_x0020_Sous_x0020_Traita?: string;
    Bureau_x0020_Client?: string;

    // Metadata
    Author?: SPListExpandedUser;
    "Author#Claims"?: string;
    Nomenclature_x002f_notice_x002f_?: string;
    CCTPRef?: string;
    Specificite_Projet?: string;
    Mail_x0020_Pm_x0020_Sous_x0020_T?: string;
    Centre_x0020_DI?: string;
    Statut_x0020_du_x0020_projet?: string;
    Achat?: string;
    SortieJson?: string;
    Schema_Uni?: string;
    SchemaData?: string;

    // System fields
    Modified?: string;
    Created?: string;
    Editor?: SPListExpandedUser;
    "Editor#Claims"?: string;

    // SharePoint internal fields
    "{Identifier}"?: string;
    "{IsFolder}"?: boolean;
    "{Thumbnail}"?: any;
    "{Link}"?: string;
    "{Name}"?: string;
    "{FilenameWithExtension}"?: string;
    "{Path}"?: string;
    "{FullPath}"?: string;
    "{ContentType}"?: any;
    "{ContentType}#Id"?: string;
    "{HasAttachments}"?: boolean;
    "{VersionNumber}"?: string;

    // Schema
    OrdreSchema?: string;

    // PowerApps Aliases
    ordreSchema?: string;
    schemaData?: string;

    // SharePoint internal names (correct)
    MailQHSEClient?: string;
    "Tel_x0020_Pm_x0020_Sous_x0020_tr"?: string;

    // Legacy compatibility
    NomPmClient?: string;
    Nom_Pm_Client?: string;
    Tel_Pm_Client?: string;
    Mail_Pm_Client?: string;
    Charge_Travaux_Client?: string;
    Tel_Charge_Travaux_Client?: string;
    Mail_Charge_Travaux_Client?: string;
    Charge_Etude_Client?: string;
    Tel_Charge_Etude_Client?: string;
    Mail_Charge_Etude_Client?: string;
    Sous_Traitant?: boolean | string;
    Pm_Sous_Traitant?: string;
    Tel_Pm_Sous_Traitant?: string;
    Mail_Pm_Sous_Traitant?: string;
    Adresse_Nexans?: string;
    Numero_Commande_Client?: string;
    Nom_Liaison?: string;
}

// 🟢 INITIAL DATA CONSTANT
export const INITIAL_DATA: ProjectData = {
    title: "Donnée test : vous n'avez pas correctement chargé votre Projet",
    operationNature: "Donnée test : vous n'avez pas correctement chargé votre Projet",
    budget: "0", specificity: "", durationWeeks: 0,
    maxStaff: 0, startDate: "", endDate: "", creationDate: "", contractNumber: "",
    projectUniqId: "",
    cctpRef: "", siteAddress: "", folderPath: "",

    // PM Nexans
    pmNexans: "", mailPmNexans: "",

    // Client
    client: "",

    // Additional dates
    trimestreRealisation: "", madu: "", dateConsignation: "", dateFinConsignation: "",

    // Measurements
    nombreLiaison: "", nombreJonction: "",

    // Work schedule
    horaires: "",

    // Type de travaux
    typesTravaux: [],

    pmClient: "", telPmClient: "", mailPmClient: "",
    clientWorkManager: "", telClientWorkManager: "", mailClientWorkManager: "",
    clientStudyManager: "", telClientStudyManager: "", mailClientStudyManager: "",
    qhseClient: "", telQhseClient: "", mailQhseClient: "",
    contactProjectManager: "", contactAssistantControl: "", contactAssistantStudy: "",
    controleurTravauxClient: "", telControleurTravauxClient: "", mailControleurTravauxClient: "",
    bureauClient: "",

    nexansAddress: "", workManagerName: "", workManagerId: 0, workManagerEmail: "", workManagerPhone: "",
    salesManager: "", salesManagerMail: "", salesManagerPhone: "",
    trainingName: "", trainingPhone: "",
    directorExecution: "", directorExecutionPhone: "",
    engineeringCable: "", engineeringCablePhone: "",
    responsableMethodeMontage: "", responsableMethodeMontagePhone: "", mailResponsableMethodeMontage: "",
    logisticsManager: "", logisticsManagerPhone: "",
    qsheManager: "", qsheManagerPhone: "", qsheManagerMail: "",
    medecin: "", medecinPhone: "",
    infirmier: "", infirmierPhone: "",
    respServiceInstall: "", telRespServiceInstall: "", mailRespServiceInstall: "",

    cables: [], accessories: [], testDuration: "",
    clientOrderNumber: "", linkName: "", length: "", gdp: "", gmr: "",
    decret: "", jonctionPuissance: "", tension: "",
    tores: "", circuit: "", extremitePoste: "", phenomeneInduction: "", typeMalt: "",

    // Documents/Booleans
    ppsps: false, paq: false, ppe: false,

    // Document references
    paqPpspsReferenceRedacteur: "", nomenclatureNotice: "",

    // Additional work info
    adresseBaseVie: "",

    hasSubcontractor: false, subcontractorPmName: "", subcontractorPmPhone: "", subcontractorPmEmail: "",

    // PGC Fields
    approver: "", verifier: "", writer: "",
    oppbtpAddress: "", oppbtpPhone: "", oppbtpEmail: "",
    drealAddress: "", drealPhone: "", drealEmail: "",
    carsatAddress: "", carsatPhone: "", carsatEmail: "",

    inspectionTravailAddress: "", inspectionTravailPhone: "", inspectionTravailMail: "",
    nomCorrespondantDechet: "", mailCorrespondantDechet: "",
    cdtGc: "", telCdtGc: "", mailCdtGc: "",
    coordinateurSps: "", telCoordinateurSps: "", mailCoordinateurSps: "",
    effectifSousTraitant: "",
    achat: "",
    statut: "",

    schemaData: "",
    ordreSchema: ""
};

// 🟢 MAPPING FUNCTION (Updated to accept STRING)
export const mapSharePointDataToProjectData = (jsonInput: string | RawProjectData): ProjectData => {
    if (!jsonInput) return INITIAL_DATA;

    let raw: any;

    try {
        // If it's a string (from PowerApps), parse it. If it's already an object, use it.
        if (typeof jsonInput === 'string') {
            raw = JSON.parse(jsonInput);
        } else {
            raw = jsonInput;
        }

        // 🟢 Robust handling: If it's an array (from PowerApps JSON(Table(...))), take the first item
        if (Array.isArray(raw)) {
            raw = raw.length > 0 ? raw[0] : null;
        }

    } catch (e) {
        console.error("Error parsing JSON:", e);
        return INITIAL_DATA;
    }

    // Checking if empty object or invalid
    if (!raw || Object.keys(raw).length === 0) return INITIAL_DATA;


    // Helper to strip HTML
    const stripHtml = (html: string) => {
        if (!html) return "";
        return html.replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&');
    };

    return {
        id: raw.ID ? raw.ID.toString() : "",
        title: raw.Title || "",
        operationNature: raw.field_6 || "",
        budget: raw.Budget ? raw.Budget.toString() : "0",
        specificity: raw.Specificite_Projet || "",
        durationWeeks: typeof raw.Dur_x00e9_eapproximative === 'string' ? parseInt(raw.Dur_x00e9_eapproximative) : (raw.Dur_x00e9_eapproximative || 0),
        maxStaff: raw.field_26 || 0,
        startDate: (raw.field_16 || "").substring(0, 10),
        endDate: (raw.field_17 || "").substring(0, 10),
        creationDate: (raw.field_2 || raw.Created || "").substring(0, 10),
        contractNumber: raw.Num_x00e9_roProjet || "",
        projectUniqId: raw.ProjectUniqID || "",
        cctpRef: raw.CCTPRef || "",
        siteAddress: raw.field_15 || raw.Centre_x0020_DI ? stripHtml(raw.Centre_x0020_DI) : "",
        folderPath: raw.FolderPath || "",

        // PM Nexans (Person lookup)
        pmNexans: raw.PmNexans?.Value || "",
        pmNexansId: raw.PmNexans?.Id || raw["PmNexans#Id"],
        mailPmNexans: raw.MailPMNexans || "",

        // Client
        client: raw.Client || "",

        // Additional dates
        trimestreRealisation: (raw.trimestrer_x00e9_alisation || "").substring(0, 10),
        madu: (raw.MADU || "").substring(0, 10),
        dateConsignation: (raw.DatedeConsignation || "").substring(0, 10),
        dateFinConsignation: (raw.DatedeFindeconsignation || "").substring(0, 10),

        // Measurements
        length: raw.Longueur ? raw.Longueur.toString() : "",
        nombreLiaison: raw.NombreLiaison || "",
        nombreJonction: raw.NombreJonction || "",

        // Work schedule
        horaires: raw.field_27 || "",

        // Type de travaux (multi-select)
        typesTravaux: raw.Typedetravaux ? raw.Typedetravaux.map((t: SPListExpandedReference) => t.Value) : [],

        // Client Info
        pmClient: raw.Nom_Pm_Client || raw.NomPmClient || "",
        telPmClient: raw.TelPmClient || raw.Tel_Pm_Client || "",
        mailPmClient: raw.MailPmClient || raw.Mail_Pm_Client || "",

        clientWorkManager: raw.Charg_x00e9_travauxClient || raw.Charge_Travaux_Client || "",
        telClientWorkManager: raw.Tel_Charge_Travaux_Client || "",
        mailClientWorkManager: raw.MailCharg_x00e9_travauxClient || raw.Mail_Charge_Travaux_Client || "",

        clientStudyManager: raw.NomCharg_x00e9__x00e9_tudeClient || raw.Charge_Etude_Client || "",
        telClientStudyManager: raw.TelCharg_x00e9__x00e9_tudeClient || raw.Tel_Charge_Etude_Client || "",
        mailClientStudyManager: raw.MailCharg_x00e9__x00e9_tudeClien || raw.Mail_Charge_Etude_Client || "",

        qhseClient: raw.QHSEClient || "",
        telQhseClient: raw.TelQHSEClient || "",
        mailQhseClient: raw.MailQHSEClient || raw.field_44 || "",

        contactProjectManager: raw.field_36 || "",
        contactAssistantStudy: raw.field_38 || "",
        contactAssistantControl: raw.field_40 || "",

        controleurTravauxClient: raw.ControleurTravauxClient || "",
        telControleurTravauxClient: raw.TelControleurTravauxClient || "",
        mailControleurTravauxClient: raw.MailControleurTravauxClient || "",

        bureauClient: raw.Bureau_x0020_Client || "",

        // Nexans Info
        nexansAddress: raw.field_50 || raw.Adresse_Nexans || "",
        workManagerName: raw.ChargetravauxNexans?.Value || "",
        workManagerId: raw.ChargetravauxNexans?.Id || raw.ChargetravauxNexansId || 0,
        workManagerEmail: raw.Mailcharg_x00e9_TravauxNexans || "",
        workManagerPhone: raw.field_62 || "",

        salesManager: raw.field_55 || "",
        salesManagerMail: raw.MailFranceSalesInstallationManag || "",
        salesManagerPhone: raw.field_56 || "",

        trainingName: raw.field_61 || "",
        trainingPhone: raw.field_72 || "",

        directorExecution: raw.field_53 || "",
        directorExecutionPhone: raw.field_54 || "",

        engineeringCable: raw.field_65 || "",
        engineeringCablePhone: raw.field_64 || "",

        responsableMethodeMontage: raw.field_67 || "",
        responsableMethodeMontagePhone: raw.field_68 || "",
        mailResponsableMethodeMontage: raw.MailResponsableM_x00e9_thodemont || "",

        logisticsManager: raw.field_69 || "",
        logisticsManagerPhone: raw.field_70 || "",

        qsheManager: raw.field_63 || "",
        qsheManagerPhone: raw.field_66 || "",
        qsheManagerMail: raw.MailresponsableQSHENexans || "",

        medecin: raw.field_71 || "",
        medecinPhone: raw.field_72 || "",

        infirmier: raw.field_73 || "",
        infirmierPhone: raw.field_74 || "",

        respServiceInstall: raw.Resp_ServiceInstal || raw.field_75 || "",
        telRespServiceInstall: raw.TelRespServiceInstall || raw.field_76 || "",
        mailRespServiceInstall: raw.MailRespServiceInstall || "",

        // Work Info
        cables: raw.Tension ? [raw.Tension] : [],
        accessories: (() => {
            if (raw.ListAccessoire) {
                try {
                    const parsed = JSON.parse(raw.ListAccessoire);
                    const result: string[] = [];
                    parsed.forEach((item: any) => {
                        for (let i = 0; i < (item.quantity || 1); i++) {
                            result.push(item.value);
                        }
                    });
                    return result;
                } catch (e) {
                    console.error("Failed to parse ListAccessoire JSON", e);
                }
            }
            return raw.Accessoire ? raw.Accessoire.map((a: any) => a.Value) : [];
        })(),
        testDuration: raw.Dur_x00e9_edesessais ? raw.Dur_x00e9_edesessais.toString() : "",
        clientOrderNumber: raw.field_4 || raw.Numero_Commande_Client || "",
        linkName: raw.NombreLiaison || raw.Nom_Liaison || "",
        gdp: raw.GDP || "",
        gmr: raw.GMR || "",
        decret: raw.D_x00e9_cret || "",
        jonctionPuissance: raw.Jonctiondepuissance || "",
        tension: raw.Tension || "",
        tores: raw.tores || "",
        circuit: raw.Circuit || "",
        extremitePoste: raw.Extr_x00e9_mit_x00e9_Poste || "",
        phenomeneInduction: raw.Ph_x00e9_nom_x00e8_nedinduction || "",
        typeMalt: raw.TypedeMalt || "",

        // Documents/Booleans
        ppsps: raw.PPSPS || false,
        paq: raw.PAQ || false,
        ppe: raw.PPE || false,

        // Document references
        paqPpspsReferenceRedacteur: raw.PAQ_x002f_PPSPSPPER_x00e9_dacteu || "",
        nomenclatureNotice: raw.Nomenclature_x002f_notice_x002f_ || "",

        // Additional work info
        adresseBaseVie: raw.AdresseBaseVie || "",

        // Subcontractor
        hasSubcontractor: !!raw.Sous_Traitant,
        subcontractorPmName: raw.PmSousTraitant || raw.Pm_Sous_Traitant || "",
        subcontractorPmPhone: raw.Tel_x0020_Pm_x0020_Sous_x0020_tr || raw.Tel_Pm_Sous_Traitant || "",
        subcontractorPmEmail: raw.Mail_x0020_Pm_x0020_Sous_x0020_T || raw.Mail_Pm_Sous_Traitant || "",

        // PGC Fields
        approver: raw.field_29 || "",
        verifier: raw.field_30 || "",
        writer: raw.PAQ_x002f_PPSPSPPER_x00e9_dacteu || "",

        oppbtpAddress: raw.Adresse_x0020_OPPBTP || "",
        oppbtpPhone: raw.Tel_x0020_OPPBTP || "",
        oppbtpEmail: raw.field_46 || "",

        drealAddress: raw.Adresse_x0020_DREAL || "",
        drealPhone: raw.Tel_x0020_DREAL || "",
        drealEmail: raw.Mail_x0020_DREAL || "",

        carsatAddress: raw.Adresse_x0020_CARSAT || "",
        carsatPhone: raw.Tel_x0020_Carsat || "",
        carsatEmail: raw.Mail_x0020_Carsat || "",


        inspectionTravailAddress: raw.Adresse_x0020_Inspection_x0020_T || "",
        inspectionTravailPhone: raw.Tel_x0020_Inspection_x0020_du_x0 || "",
        inspectionTravailMail: raw.Mail_x0020_Inspection_x0020_du_x || "",

        nomCorrespondantDechet: raw.NomCorrespondantD_x00e9_chet || "",
        mailCorrespondantDechet: raw.MailCorrespondantD_x00e9_chet || "",

        cdtGc: raw.Cdt_x0020_GC || "",
        telCdtGc: raw.Tel_x0020_Cdt_x0020_GC || "",
        mailCdtGc: raw.Mail_x0020_Cdt_x0020_GC || "",

        coordinateurSps: raw.CoordonateurSPS || "",
        telCoordinateurSps: raw.TelCoordonateurSPS || "",
        mailCoordinateurSps: raw.MailCoordonateurSPS || "",

        effectifSousTraitant: raw.Effectif_x0020_Sous_x0020_Traita || "",

        achat: raw.Achat || "",
        statut: raw.Statut_x0020_du_x0020_projet || "",

        // Schema
        schemaData: raw.SchemaData || "",
        ordreSchema: raw.OrdreSchema || "",
    };
};

// 🟢 REVERSE MAPPING FUNCTION (Export to SharePoint/PowerApps Raw Format)
export const mapProjectDataToSharePointData = (
    data: ProjectData,
    fullAccessories?: AccessoryOption[],
    fullCables?: CableOption[],
    fullMonteurs?: MonteurOption[]
): RawProjectData => {
    return {
        // Core Fields
        ID: data.id ? parseInt(data.id) : undefined,
        id: data.id,
        Title: data.title,
        field_6: data.operationNature,
        Num_x00e9_roProjet: data.contractNumber,
        ProjectUniqID: data.projectUniqId,
        Specificite_Projet: data.specificity,
        Dur_x00e9_eapproximative: (data.durationWeeks || 0).toString(),
        field_26: data.maxStaff,
        field_2: data.creationDate,
        field_16: data.startDate,
        field_17: data.endDate,
        Created: data.creationDate,
        CCTPRef: data.cctpRef,
        FolderPath: data.folderPath,

        // Budget
        Budget: data.budget,

        // PM Nexans
        MailPMNexans: data.mailPmNexans,
        PmNexans: {
            "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference",
            Id: data.pmNexansId || 0,
            Value: data.pmNexans || "",
        },

        // Client
        Client: data.client,

        // Additional dates
        trimestrer_x00e9_alisation: data.trimestreRealisation,
        MADU: data.madu,
        DatedeConsignation: data.dateConsignation,
        DatedeFindeconsignation: data.dateFinConsignation,

        // Measurements
        Longueur: data.length,
        NombreLiaison: data.nombreLiaison,
        NombreJonction: data.nombreJonction,

        // Work schedule
        field_27: data.horaires,

        // Address
        Centre_x0020_DI: data.siteAddress,
        field_15: data.siteAddress,
        AdresseBaseVie: data.adresseBaseVie,

        // Client Info
        NomPmClient: data.pmClient,
        Nom_Pm_Client: data.pmClient, // legacy alias
        TelPmClient: data.telPmClient,
        MailPmClient: data.mailPmClient,

        Charg_x00e9_travauxClient: data.clientWorkManager,
        Tel_Charge_Travaux_Client: data.telClientWorkManager,
        MailCharg_x00e9_travauxClient: data.mailClientWorkManager,

        NomCharg_x00e9__x00e9_tudeClient: data.clientStudyManager,
        TelCharg_x00e9__x00e9_tudeClient: data.telClientStudyManager,
        MailCharg_x00e9__x00e9_tudeClien: data.mailClientStudyManager,

        QHSEClient: data.qhseClient,
        TelQHSEClient: data.telQhseClient,
        MailQHSEClient: data.mailQhseClient,
        field_44: data.mailQhseClient, // legacy alias

        field_36: data.contactProjectManager,
        field_38: data.contactAssistantStudy,
        field_40: data.contactAssistantControl,

        ControleurTravauxClient: data.controleurTravauxClient,
        TelControleurTravauxClient: data.telControleurTravauxClient,
        MailControleurTravauxClient: data.mailControleurTravauxClient,

        Bureau_x0020_Client: data.bureauClient,

        // Nexans Info
        field_50: data.nexansAddress,
        Adresse_Nexans: data.nexansAddress, // legacy alias
        Mailcharg_x00e9_TravauxNexans: data.workManagerEmail,
        field_62: data.workManagerPhone,
        ChargetravauxNexans: {
            "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference",
            Id: data.workManagerId || 0,
            Value: data.workManagerName || "",
        },

        field_55: data.salesManager,
        MailFranceSalesInstallationManag: data.salesManagerMail,
        field_56: data.salesManagerPhone,

        field_61: data.trainingName,
        // field_72 used for both training phone and medecin phone - conflict

        field_53: data.directorExecution,
        field_54: data.directorExecutionPhone,

        field_65: data.engineeringCable,
        field_64: data.engineeringCablePhone,

        field_67: data.responsableMethodeMontage,
        field_68: data.responsableMethodeMontagePhone,
        MailResponsableM_x00e9_thodemont: data.mailResponsableMethodeMontage,

        field_69: data.logisticsManager,
        field_70: data.logisticsManagerPhone,

        field_63: data.qsheManager,
        field_66: data.qsheManagerPhone,
        MailresponsableQSHENexans: data.qsheManagerMail,

        field_71: data.medecin,
        field_72: data.medecinPhone,

        field_73: data.infirmier,
        field_74: data.infirmierPhone,

        Resp_ServiceInstal: data.respServiceInstall,
        field_75: data.respServiceInstall, // legacy alias
        TelRespServiceInstall: data.telRespServiceInstall,
        field_76: data.telRespServiceInstall, // legacy alias
        MailRespServiceInstall: data.mailRespServiceInstall,

        // Work Info
        Tension: data.tension || (data.cables?.length > 0 ? data.cables[0] : ""),
        Dur_x00e9_edesessais: data.testDuration,
        field_4: data.clientOrderNumber,
        Numero_Commande_Client: data.clientOrderNumber, // legacy alias
        GDP: data.gdp,
        GMR: data.gmr,
        D_x00e9_cret: data.decret,
        Jonctiondepuissance: data.jonctionPuissance,
        tores: data.tores,
        Circuit: data.circuit,
        Extr_x00e9_mit_x00e9_Poste: data.extremitePoste,
        Ph_x00e9_nom_x00e8_nedinduction: data.phenomeneInduction,
        TypedeMalt: data.typeMalt,

        // Documents/Booleans
        PPSPS: data.ppsps,
        PAQ: data.paq,
        PPE: data.ppe,

        // Document references
        PAQ_x002f_PPSPSPPER_x00e9_dacteu: data.pmNexans,
        Nomenclature_x002f_notice_x002f_: data.nomenclatureNotice,

        // Subcontractor
        Sous_Traitant: data.hasSubcontractor,
        PmSousTraitant: data.subcontractorPmName,
        Tel_x0020_Pm_x0020_Sous_x0020_tr: data.subcontractorPmPhone,
        Tel_Pm_Sous_Traitant: data.subcontractorPmPhone, // legacy alias
        Mail_x0020_Pm_x0020_Sous_x0020_T: data.subcontractorPmEmail,

        // PGC Fields
        field_29: data.approver,
        field_30: data.verifier,
        // writer was previously mapped somewhere else but PAQ_x002f_PPSPSPPER_x00e9_dacteu handles it

        Adresse_x0020_OPPBTP: data.oppbtpAddress,
        Tel_x0020_OPPBTP: data.oppbtpPhone,
        field_46: data.oppbtpEmail,

        Adresse_x0020_DREAL: data.drealAddress,
        Tel_x0020_DREAL: data.drealPhone,
        Mail_x0020_DREAL: data.drealEmail,

        Adresse_x0020_CARSAT: data.carsatAddress,
        Tel_x0020_Carsat: data.carsatPhone,
        Mail_x0020_Carsat: data.carsatEmail,

        Adresse_x0020_Inspection_x0020_T: data.inspectionTravailAddress,
        Tel_x0020_Inspection_x0020_du_x0: data.inspectionTravailPhone,
        Mail_x0020_Inspection_x0020_du_x: data.inspectionTravailMail,

        NomCorrespondantD_x00e9_chet: data.nomCorrespondantDechet,
        MailCorrespondantD_x00e9_chet: data.mailCorrespondantDechet,

        Cdt_x0020_GC: data.cdtGc,
        Tel_x0020_Cdt_x0020_GC: data.telCdtGc,
        Mail_x0020_Cdt_x0020_GC: data.mailCdtGc,

        CoordonateurSPS: data.coordinateurSps,
        TelCoordonateurSPS: data.telCoordinateurSps,
        MailCoordonateurSPS: data.mailCoordinateurSps,

        // 🟢 FIX: Map Accessoire objects with ID
        Accessoire: data.accessories.map(accName => {
            const found = fullAccessories?.find(fa => {
                const part1 = fa.field_5 || fa.Title;
                const part2 = fa.Ame ? ` - ${fa.Ame}` : "";
                const generatedName = (part1 + part2) || "";
                return generatedName === accName;
            });

            const foundId = found?.ID || found?.Id;
            if (foundId) {
                return { Id: foundId, Value: found.Title, "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference" };
            }
            return { Id: -1, Value: accName, "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference" }; // Fallback
        }).filter(a => a.Id !== -1),

        // 🟢 NOUVEAU: ListAccessoire en JSON avec quantité
        ListAccessoire: (() => {
            const listObj = data.accessories.reduce((acc, accName) => {
                if (!acc[accName]) {
                    const found = fullAccessories?.find(fa => {
                        const part1 = fa.field_5 || fa.Title;
                        const part2 = fa.Ame ? ` - ${fa.Ame}` : "";
                        const generatedName = (part1 + part2) || "";
                        return generatedName === accName;
                    });
                    const foundId = found?.ID || found?.Id || -1;
                    acc[accName] = { id: foundId, value: accName, quantity: 1 };
                } else {
                    acc[accName].quantity += 1;
                }
                return acc;
            }, {} as Record<string, { id: number, value: string, quantity: number }>);
            return JSON.stringify(Object.values(listObj));
        })(),

        // 🟢 FIX: Map Cable objects with ID
        Cable: data.cables.map(cableName => {
            const found = fullCables?.find(fc => {
                const parts = [
                    fc.Title,
                    fc.Section,
                    fc.Ame,
                    fc.D_x00e9_tailssuppl_x00e9_mentair,
                    fc._x00c2_me,
                    fc.OData__x00c2_me
                ].filter(Boolean).join(" - ");
                return parts === cableName;
            });

            if (found?.ID) {
                return { Id: found.ID, Value: found.Title, "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference" };
            }
            return { Id: -1, Value: cableName, "@odata.type": "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference" };
        }).filter(c => c.Id !== -1),

        Effectif_x0020_Sous_x0020_Traita: data.effectifSousTraitant,

        Achat: data.achat,
        Statut_x0020_du_x0020_projet: data.statut,

        // Schema
        Schema_Uni: data.ordreSchema, // Maps to the IDs (CSV)
        SchemaData: data.schemaData,  // Maps to the JSON
        OrdreSchema: data.ordreSchema,

        // PowerApps Aliases (lowercase for easy JSON access)
        ordreSchema: data.ordreSchema,
        schemaData: data.schemaData
    };
};