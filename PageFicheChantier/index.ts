import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import App, { IAppProps } from "./App";

export class PageFicheChantier implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;

    // Output values — initialized to ""
    private _latestChange = "";
    private _navigationRequest = "";
    private _schemaChange = "";
    // Outputs tableaux CCTP — un JSON par section (clé = nom de la propriété output)
    private _cctpTables: Record<string, string> = {};

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

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const props: IAppProps = {
            pcfContext: context,
            projectDataJson: context.parameters.projectData.raw || "",
            currentSchemaJson: context.parameters.currentSchema?.raw || "",
            accessoriesOptionsJson: context.parameters.accessoriesOptions?.raw || "",
            cablesOptionsJson: context.parameters.cablesOptions?.raw || "",
            monteursOptionsJson: context.parameters.monteursOptions?.raw || "",
            cctpJson: context.parameters.Input_CCTPJson?.raw || "",
            onDataChange: (newDataJson: string) => {
                console.log("[PCF index.ts] onDataChange called, JSON length:", newDataJson.length);
                this._latestChange = newDataJson;
                this._notifyOutputChanged();
                console.log("[PCF index.ts] notifyOutputChanged() called successfully");
            },
            onSchemaChange: (schemaJson: string) => {
                console.log("[PCF index.ts] onSchemaChange called, JSON length:", schemaJson.length);
                this._schemaChange = schemaJson;
                this._notifyOutputChanged();
            },
            onNavigate: (target: string) => {
                this._navigationRequest = target;
                this._notifyOutputChanged();
            },
            onTablesChange: (outputKey: string, json: string) => {
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
        console.log("[PCF index.ts] getOutputs() called, latestChange length:", this._latestChange?.length);
        return {
            latestChange: this._latestChange,
            navigationRequest: this._navigationRequest,
            schemaChange: this._schemaChange,
            cctpInterlocuteursExternes: this._cctpTables.cctpInterlocuteursExternes ?? "",
            cctpInterlocuteursClient: this._cctpTables.cctpInterlocuteursClient ?? "",
            cctpRedactionIndice: this._cctpTables.cctpRedactionIndice ?? "",
            cctpCaracteristiquesSps: this._cctpTables.cctpCaracteristiquesSps ?? "",
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this._container);
    }
}
