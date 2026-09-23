import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import App, { IAppProps } from "./App";

export class PageFicheChantier implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;

    // Output values — initialized to ""
    private _latestChange = "";
    private _schemaChange = "";
    // Déclencheur du flux VerifierDossiersSchema : le timestamp change à chaque
    // enregistrement, donc Power Apps déclenche OnChange même si le schéma est identique.
    private _schemaSaveTimestamp = "";
    private _schemaProjectUniqId = "";
    // Outputs tableaux CCTP — un JSON par section (clé = nom de la propriété output)
    private _cctpTables: Record<string, string> = {};
    // Sections réellement modifiées dans l'éditeur, pour la fiche courante.
    private _cctpEdited = new Set<string>();
    // Fiche à laquelle se rapportent _cctpTables / _cctpEdited.
    private _cctpRecordKey: string | null = null;

    constructor() {
        // Empty
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._container = container;

        // Make container fill available space
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.overflow = "hidden";
    }

    /** Identifiant de la fiche portée par projectData (tolérant au format). */
    private static recordKey(projectDataJson: string): string {
        if (!projectDataJson.trim()) return "";
        try {
            const raw = JSON.parse(projectDataJson);
            const item = Array.isArray(raw) ? raw[0] : raw;
            return String(item?.ID ?? item?.id ?? "");
        } catch {
            return "";
        }
    }

    /**
     * Le contrôle n'est pas démonté quand l'utilisateur change de fiche : sans
     * cette remise à zéro, les outputs continueraient d'exposer les tableaux de
     * la fiche précédente et un Patch les écrirait dans la nouvelle.
     */
    private resetCctpOutputsOnRecordChange(projectDataJson: string): void {
        const key = PageFicheChantier.recordKey(projectDataJson);
        if (this._cctpRecordKey === key) return;
        this._cctpRecordKey = key;
        this._cctpTables = {};
        this._cctpEdited.clear();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const projectDataJson = context.parameters.projectData.raw || "";
        this.resetCctpOutputsOnRecordChange(projectDataJson);

        const props: IAppProps = {
            pcfContext: context,
            projectDataJson,
            currentSchemaJson: context.parameters.currentSchema?.raw || "",
            accessoriesOptionsJson: context.parameters.accessoriesOptions?.raw || "",
            cablesOptionsJson: context.parameters.cablesOptions?.raw || "",
            monteursOptionsJson: context.parameters.monteursOptions?.raw || "",
            cctpJson: context.parameters.Input_CCTPJson?.raw || "",
            savedTablesJson: context.parameters.Input_CctpTablesJson?.raw || "",
            onDataChange: (newDataJson: string) => {
                this._latestChange = newDataJson;
                this._notifyOutputChanged();
            },
            onSchemaChange: (schemaJson: string, projectUniqId: string) => {
                this._schemaChange = schemaJson;
                this._schemaProjectUniqId = projectUniqId;
                this._schemaSaveTimestamp = new Date().toISOString();
                this._notifyOutputChanged();
            },
            onTablesChange: (outputKey: string, json: string) => {
                this._cctpEdited.add(outputKey);
                this._cctpTables[outputKey] = json;
                this._notifyOutputChanged();
            },
        };

        ReactDOM.render(
            React.createElement(App, props),
            this._container
        );
    }

    public getOutputs(): IOutputs {
        return {
            latestChange: this._latestChange,
            schemaChange: this._schemaChange,
            schemaSaveTimestamp: this._schemaSaveTimestamp,
            schemaProjectUniqId: this._schemaProjectUniqId,
            cctpInterlocuteursExternes: this._cctpTables.cctpInterlocuteursExternes ?? "",
            cctpInterlocuteursClient: this._cctpTables.cctpInterlocuteursClient ?? "",
            cctpRedactionIndice: this._cctpTables.cctpRedactionIndice ?? "",
            cctpCaracteristiquesSps: this._cctpTables.cctpCaracteristiquesSps ?? "",
            cctpSousTraitants: this._cctpTables.cctpSousTraitants ?? "",
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this._container);
    }
}
