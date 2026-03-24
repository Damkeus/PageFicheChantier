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
            accessoriesOptionsJson: context.parameters.accessoriesOptions?.raw || "",
            cablesOptionsJson: context.parameters.cablesOptions?.raw || "",
            monteursOptionsJson: context.parameters.monteursOptions?.raw || "",
            onDataChange: (newDataJson: string) => {
                console.log("[PCF index.ts] onDataChange called, JSON length:", newDataJson.length);
                this._latestChange = newDataJson;
                this._notifyOutputChanged();
                console.log("[PCF index.ts] notifyOutputChanged() called successfully");
            },
            onNavigate: (target: string) => {
                this._navigationRequest = target;
                this._notifyOutputChanged();
            }
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
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this._container);
    }
}
