/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!sql/parts/query/editor/media/queryActions';
import * as nls from 'vs/nls';
import { Builder, $ } from 'vs/base/browser/builder';
import { Action, IActionItem, IActionRunner } from 'vs/base/common/actions';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { TPromise } from 'vs/base/common/winjs.base';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { INotificationService } from 'vs/platform/notification/common/notification';
import Severity from 'vs/base/common/severity';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IRange } from 'vs/editor/common/core/range';

import { QueryInput } from 'sql/parts/query/common/queryInput';
import { EventEmitter } from 'sql/base/common/eventEmitter';
import { attachEditableDropdownStyler, attachSelectBoxStyler } from 'sql/common/theme/styler';
import {
	IConnectionManagementService, IConnectionParams, INewConnectionParams,
	ConnectionType, IConnectableInput, RunQueryOnConnectionMode
} from 'sql/parts/connection/common/connectionManagement';
import { SelectBox } from 'sql/base/browser/ui/selectBox/selectBox';
import { Dropdown } from 'sql/base/browser/ui/editableDropdown/dropdown';
import { ICapabilitiesService } from 'sql/services/capabilities/capabilitiesService';

export interface IQueryActionContext {
	input: QueryInput;
	editor: ICodeEditor;
}

/**
 * Action class that runs a query in the active SQL text document.
 */
export class RunQueryAction extends Action {

	public static EnabledClass = 'start';
	public static ID = 'runQueryAction';
	public static LABEL = nls.localize('runQueryLabel', 'Run');

	constructor() {
		super(RunQueryAction.ID, RunQueryAction.LABEL, RunQueryAction.EnabledClass);
	}

	public run(context: IQueryActionContext, selection?: IRange): TPromise<void> {
		context.input.runQuery(selection);
		return TPromise.as(null);
	}
}

export class RunQuerySelectionAction extends RunQueryAction {

}

/**
 * Action class that either launches a connection dialogue for the current query file,
 * or disconnects the active connection
 */
export class ToggleConnectDatabaseAction extends Action {

	public static readonly ConnectClass = 'connect';
	public static readonly DisconnectClass = 'disconnect';
	public static readonly ID = 'toggleConnectDatabaseAction';
	public static readonly ConnectLabel = nls.localize('connectDatabaseLabel', 'Connect');
	public static readonly DisconnectLabel = nls.localize('disconnectDatabaseLabel', 'Disconnect');

	private _connected: boolean = false;

	constructor(
		@IConnectionManagementService private connectionManagementService: IConnectionManagementService,
		@ICapabilitiesService private capbilitiesService: ICapabilitiesService
	) {
		super(ToggleConnectDatabaseAction.ID, ToggleConnectDatabaseAction.ConnectLabel, ToggleConnectDatabaseAction.ConnectClass);
	}

	public get connected(): boolean {
		return this._connected;
	}

	public set connected(value: boolean) {
		// intentionally always updating, since parent class handles skipping if values
		this._connected = value;
		this.updateLabelAndIcon();
	}

	private updateLabelAndIcon(): void {
		this.label = this.connected ? ToggleConnectDatabaseAction.DisconnectLabel : ToggleConnectDatabaseAction.ConnectLabel;
		this.class = this.connected ? ToggleConnectDatabaseAction.DisconnectClass : ToggleConnectDatabaseAction.ConnectClass;
	}

	public run(context: IQueryActionContext): TPromise<void> {
		if (this.connected) {
			// Call disconnectEditor regardless of the connection state and let the ConnectionManagementService
			// determine if we need to disconnect, cancel an in-progress connection, or do nothing
			let params: IConnectableInput = {
				uri: context.input.uri,
				onConnectCanceled: undefined,
				onConnectReject: undefined,
				onConnectStart: undefined,
				onConnectSuccess: undefined,
				onDisconnect: () => {
					this.connected = false;
				}
			};
			this.connectionManagementService.disconnectEditor(params);
		} else {
			let params: INewConnectionParams = {
				input: {
					uri: context.input.uri,
					onConnectCanceled: undefined,
					onConnectReject: undefined,
					onConnectStart: undefined,
					onConnectSuccess: () => {
						this.connected = true;
					},
					onDisconnect: undefined
				},
				connectionType: ConnectionType.editor,
				runQueryOnCompletion: RunQueryOnConnectionMode.none
			};
			this.connectionManagementService.showConnectionDialog(params);
		}
		return TPromise.as(null);
	}
}

/**
 * Action class that is tied with ListDatabasesActionItem.
 */
export class ListDatabasesAction extends Action {

	public static ID = 'listDatabaseQueryAction';

	constructor() {
		super(ListDatabasesAction.ID, undefined);
	}

	public run(): TPromise<void> {
		return TPromise.as(null);
	}
}

/*
 * Action item that handles the dropdown (combobox) that lists the available databases.
 * Based off StartDebugActionItem.
 */
export class ListDatabasesActionItem extends EventEmitter implements IActionItem {
	public static ID = 'listDatabaseQueryActionItem';

	public actionRunner: IActionRunner;
	private _toDispose: IDisposable[];
	private _context: IQueryActionContext;
	private _currentDatabaseName: string;
	private _isConnected: boolean;
	private $databaseListDropdown: Builder;
	private _dropdown: Dropdown;
	private _databaseSelectBox: SelectBox;
	private _isInAccessibilityMode: boolean;
	private readonly _selectDatabaseString: string = nls.localize("selectDatabase", "Select Database");

	// CONSTRUCTOR /////////////////////////////////////////////////////////
	constructor(
		@IConnectionManagementService private _connectionManagementService: IConnectionManagementService,
		@INotificationService private _notificationService: INotificationService,
		@IContextViewService contextViewProvider: IContextViewService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();
		this._toDispose = [];
		this.$databaseListDropdown = $('.databaseListDropdown');
		this._isInAccessibilityMode = this._configurationService.getValue('editor.accessibilitySupport') === 'on';

		if (this._isInAccessibilityMode) {
			this._databaseSelectBox = new SelectBox([this._selectDatabaseString], this._selectDatabaseString, contextViewProvider, undefined, { ariaLabel: this._selectDatabaseString });
			this._databaseSelectBox.render(this.$databaseListDropdown.getHTMLElement());
			this._databaseSelectBox.onDidSelect(e => { this.databaseSelected(e.selected); });
			this._databaseSelectBox.disable();

		} else {
			this._dropdown = new Dropdown(this.$databaseListDropdown.getHTMLElement(), contextViewProvider, themeService, {
				strictSelection: true,
				placeholder: this._selectDatabaseString,
				ariaLabel: this._selectDatabaseString,
				actionLabel: nls.localize('listDatabases.toggleDatabaseNameDropdown', 'Select Database Toggle Dropdown')
			});
			this._dropdown.onValueChange(s => this.databaseSelected(s));
			this._toDispose.push(this._dropdown.onFocus(this.onDropdownFocus, this));
		}

		// Register event handlers
		this._toDispose.push(this._connectionManagementService.onConnectionChanged(params => this.onConnectionChanged(params)));
	}

	// PUBLIC METHODS //////////////////////////////////////////////////////
	public render(container: HTMLElement): void {
		this.$databaseListDropdown.appendTo(container);
	}

	public style(styles) {
		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.style(styles);
		}
		else {
			this._dropdown.style(styles);
		}
	}

	public setActionContext(context: IQueryActionContext): void {
		this._context = context;
	}

	public isEnabled(): boolean {
		return !!this._isConnected;
	}

	public focus(): void {
		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.focus();
		} else {
			this._dropdown.focus();
		}
	}

	public blur(): void {
		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.blur();
		} else {
			this._dropdown.blur();
		}
	}

	public attachStyler(themeService: IThemeService): IDisposable {
		if (this._isInAccessibilityMode) {
			return attachSelectBoxStyler(this, themeService);
		} else {
			return attachEditableDropdownStyler(this, themeService);
		}
	}

	public dispose(): void {
		this._toDispose = dispose(this._toDispose);
	}

	// EVENT HANDLERS FROM EDITOR //////////////////////////////////////////
	public onConnected(): void {
		let dbName = this.getCurrentDatabaseName();
		this.updateConnection(dbName);
	}

	public onDisconnect(): void {
		this._isConnected = false;
		this._currentDatabaseName = undefined;

		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.disable();
			this._databaseSelectBox.setOptions([this._selectDatabaseString]);
		} else {
			this._dropdown.enabled = false;
			this._dropdown.value = '';
		}
	}

	// PRIVATE HELPERS /////////////////////////////////////////////////////
	private databaseSelected(dbName: string): void {
		let uri = this._context.input.uri;
		if (!uri) {
			return;
		}

		let profile = this._connectionManagementService.getConnectionProfile(uri);
		if (!profile) {
			return;
		}

		this._connectionManagementService.changeDatabase(uri, dbName)
			.then(
				result => {
					if (!result) {
						this.resetDatabaseName();
						this._notificationService.notify({
							severity: Severity.Error,
							message: nls.localize('changeDatabase.failed', "Failed to change database")
						});
					}
				},
				error => {
					this.resetDatabaseName();
					this._notificationService.notify({
						severity: Severity.Error,
						message: nls.localize('changeDatabase.failedWithError', "Failed to change database {0}", error)
					});
				});
	}

	private getCurrentDatabaseName() {
		let uri = this._context.input.uri;
		if (uri) {
			let profile = this._connectionManagementService.getConnectionProfile(uri);
			if (profile) {
				return profile.databaseName;
			}
		}
		return undefined;
	}

	private resetDatabaseName() {
		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.selectWithOptionName(this.getCurrentDatabaseName());
		} else {
			this._dropdown.value = this.getCurrentDatabaseName();
		}
	}

	private onConnectionChanged(connParams: IConnectionParams): void {
		if (!connParams) {
			return;
		}

		let uri = this._context.input.uri;
		if (uri !== connParams.connectionUri) {
			return;
		}

		this.updateConnection(connParams.connectionProfile.databaseName);
	}

	private onDropdownFocus(): void {
		let uri = this._context.input.uri;
		if (!uri) {
			return;
		}

		this._connectionManagementService.listDatabases(uri)
			.then(result => {
				if (result && result.databaseNames) {
					this._dropdown.values = result.databaseNames;
				}
			});
	}

	private updateConnection(databaseName: string) {
		this._isConnected = true;
		this._currentDatabaseName = databaseName;

		if (this._isInAccessibilityMode) {
			this._databaseSelectBox.enable();
			let uri = this._context.input.uri;
			if (!uri) {
				return;
			}
			this._connectionManagementService.listDatabases(uri)
				.then(result => {
					if (result && result.databaseNames) {
						this._databaseSelectBox.setOptions(result.databaseNames);
					}
					this._databaseSelectBox.selectWithOptionName(databaseName);
				});
		} else {
			this._dropdown.enabled = true;
			this._dropdown.value = databaseName;
		}
	}

	// TESTING PROPERTIES //////////////////////////////////////////////////
	public get currentDatabaseName(): string {
		return this._currentDatabaseName;
	}

}
