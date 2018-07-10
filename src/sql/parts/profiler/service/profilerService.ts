/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConnectionManagementService, IConnectionCompletionOptions, ConnectionType, RunQueryOnConnectionMode } from 'sql/parts/connection/common/connectionManagement';
import {
	ProfilerSessionID, IProfilerSession, IProfilerService, IProfilerSessionTemplate, IProfilerViewTemplate,
	PROFILER_SETTINGS, IProfilerSettings
} from './interfaces';
import { IConnectionProfile } from 'sql/parts/connection/common/interfaces';
import { ProfilerInput } from 'sql/parts/profiler/editor/profilerInput';
import { ProfilerColumnEditorDialog } from 'sql/parts/profiler/dialog/profilerColumnEditorDialog';

import * as sqlops from 'sqlops';

import { TPromise } from 'vs/base/common/winjs.base';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Severity } from 'vs/editor/common/standalone/standaloneBase';
import { Choice } from 'vs/editor/contrib/snippet/snippetParser';

class TwoWayMap<T, K> {
	private forwardMap: Map<T, K>;
	private reverseMap: Map<K, T>;

	constructor() {
		this.forwardMap = new Map<T, K>();
		this.reverseMap = new Map<K, T>();
	}

	get(input: T): K {
		return this.forwardMap.get(input);
	}

	reverseGet(input: K): T {
		return this.reverseMap.get(input);
	}

	set(input: T, input2: K): TwoWayMap<T, K> {
		this.forwardMap.set(input, input2);
		this.reverseMap.set(input2, input);
		return this;
	}
}

export class ProfilerService implements IProfilerService {
	public _serviceBrand: any;
	private _providers = new Map<string, sqlops.ProfilerProvider>();
	// why is this a two way map? What's the point of doing any of this???
	private _idMap = new TwoWayMap<ProfilerSessionID, string>();
	// profiler session id's to profiler inputs
	private _profilerSessionMap = new Map<ProfilerSessionID, IProfilerSession>();
	private _dialog: ProfilerColumnEditorDialog;

	constructor(
		@IConnectionManagementService private _connectionService: IConnectionManagementService,
		@IConfigurationService public _configurationService: IConfigurationService,
		@IInstantiationService private _instantiationService: IInstantiationService,
		@INotificationService private _notificationService: INotificationService
	) { }

	public registerProvider(providerId: string, provider: sqlops.ProfilerProvider): void {
		this._providers.set(providerId, provider);
	}

	public registerSession(uri: string, connectionProfile: IConnectionProfile, session: IProfilerSession): ProfilerSessionID {
		let options: IConnectionCompletionOptions = {
			params: { connectionType: ConnectionType.default, runQueryOnCompletion: RunQueryOnConnectionMode.none, input: undefined },
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: false,
			showFirewallRuleOnError: true
		};
		this._connectionService.connect(connectionProfile, uri, options).then(() => {

		}).catch(connectionError => {

		});
		this._profilerSessionMap.set(uri, session);
		this._idMap.set(uri, uri);
		return uri;
	}

	public onMoreRows(params: sqlops.ProfilerSessionEvents): void {

		this._profilerSessionMap.get(params.profilerSessionId).onMoreRows(params);
	}

	// it might finally be time to tackle the Id map!!!

	public onSessionStopped(params: sqlops.ProfilerSessionStoppedNotification): void {
		// TODO: Confirm that tools service sends a notification for each profiler session that's affected
		this._profilerSessionMap.get(params.profilerSessionId).onSessionStopped(params);
	}

	public connectSession(id: ProfilerSessionID): Thenable<boolean> {
		return this._runAction(id, provider => provider.connectSession(this._idMap.get(id)));
	}

	public disconnectSession(id: ProfilerSessionID): Thenable<boolean> {
		return this._runAction(id, provider => provider.disconnectSession(this._idMap.get(id)));
	}

	public createSession(id: ProfilerSessionID, createStatement: string, xEventSessionName: string): Thenable<sqlops.CreateProfilerSessionResponse> {
		return this._runAction(id, provider => provider.createSession(id, createStatement, xEventSessionName)).then((r) => {
			let profilerSession = this._profilerSessionMap.get(id);
			if (r.succeeded) {
				// TODO: should also clear the view pane here
				// TODO: update the profiler session name or something
				profilerSession.onSessionStateChanged({ isRunning: true, isStopped: false, isPaused: false });
			} else {
				this._notificationService.prompt(
					Severity.Error,
					r.errorMessage,
					[{
						label: 'Close',
						run: () => {}
					}]
				);
			}
			return r;
		});
	}

	public startSession(id: ProfilerSessionID, xEventSessionName: string): Thenable<sqlops.StartProfilingResponse> {
		return this._runAction(id, provider => provider.startSession(id, xEventSessionName)).then((r) => {
			let profilerSession = this._profilerSessionMap.get(id);
			if (r.succeeded) {
				// TODO: should also clear the view pane here
				profilerSession.onSessionStateChanged({ isRunning: true, isStopped: false, isPaused: false });
			} else {
				this._notificationService.prompt(
					Severity.Error,
					r.errorMessage,
					[{
						label: 'Close',
						run: () => {}
					}]
				);
			}
			return r;
		});
	}

	public pauseSession(id: ProfilerSessionID): Thenable<boolean> {
		return this._runAction(id, provider => provider.pauseSession(this._idMap.get(id)));
	}

	public stopSession(id: ProfilerSessionID): Thenable<boolean> {
		return this._runAction(id, provider => provider.stopSession(this._idMap.get(id))).then(() => {
			this._profilerSessionMap.get(this._idMap.reverseGet(id)).onSessionStateChanged({ isStopped: true, isPaused: false, isRunning: false });
			return true;
		});
	}

	public listAvailableSessions(id: ProfilerSessionID): Thenable<sqlops.ListAvailableSessionsResponse> {
		return this._runAction(id, provider => provider.listAvailableSessions(id)).then((r) => {
			let profilerSession = this._profilerSessionMap.get(id);
			if (r.succeeded) {
				// here is where I notify about new events
				// not sure how to do that tbh, but it shouldn't be too bad, right?
			} else {
				this._notificationService.warn(r.errorMessage);
			}
			return r;
		});
	}

	private _runAction<T>(id: ProfilerSessionID, action: (handler: sqlops.ProfilerProvider) => Thenable<T>): Thenable<T> {
		// let providerId = this._connectionService.getProviderIdFromUri(this._idMap.get(id));
		let providerId = 'MSSQL';

		if (!providerId) {
			return TPromise.wrapError(new Error('Connection is required in order to interact with queries'));
		}
		let handler = this._providers.get(providerId);
		if (handler) {
			return action(handler);
		} else {
			return TPromise.wrapError(new Error('No Handler Registered'));
		}
	}

	public getSessionTemplates(provider?: string): Array<IProfilerSessionTemplate> {
		let config = <IProfilerSettings>this._configurationService.getValue(PROFILER_SETTINGS);

		if (provider) {
			return config.sessionTemplates;
		} else {
			return config.sessionTemplates;
		}
	}

	public getViewTemplates(provider?: string): Array<IProfilerViewTemplate> {
		let config = <IProfilerSettings>this._configurationService.getValue(PROFILER_SETTINGS);

		if (provider) {
			return config.viewTemplates;
		} else {
			return config.viewTemplates;
		}
	}

	public launchColumnEditor(input?: ProfilerInput): Thenable<void> {
		if (!this._dialog) {
			this._dialog = this._instantiationService.createInstance(ProfilerColumnEditorDialog);
			this._dialog.render();
		}

		this._dialog.open(input);
		return TPromise.as(null);
	}
}
