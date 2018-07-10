/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConnectionProfile } from 'sql/parts/connection/common/interfaces';
import { ProfilerInput } from 'sql/parts/profiler/editor/profilerInput';

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import * as sqlops from 'sqlops';
import { INewProfilerState } from '../editor/profilerState';

const PROFILER_SERVICE_ID = 'profilerService';
export const IProfilerService = createDecorator<IProfilerService>(PROFILER_SERVICE_ID);

export type ProfilerSessionID = string;

export const PROFILER_SESSION_TEMPLATE_SETTINGS = 'profiler.sessionTemplates';
export const PROFILER_VIEW_TEMPLATE_SETTINGS = 'profiler.viewTemplates';
export const PROFILER_SETTINGS = 'profiler';

/**
 * A front end provider for a profiler session
 */
export interface IProfilerSession {
	/**
	 * Called by the service when more rows are available to render
	 */
	onMoreRows(events: sqlops.ProfilerSessionEvents);
	/**
	 * Called by the service when the session is closed unexpectedly
	 */
	onSessionStopped(events: sqlops.ProfilerSessionStoppedNotification);
	/**
	 * Called by the service when the session state is changed
	 */
	onSessionStateChanged(newState: INewProfilerState);
}

/**
 * A Profiler Service that handles session communication between the backends and frontends
 */
export interface IProfilerService {
	_serviceBrand: any;
	/**
	 * Registers a backend provider for profiler session. ex: mssql
	 */
	registerProvider(providerId: string, provider: sqlops.ProfilerProvider): void;
	/**
	 * Registers a session with the service that acts as the UI for a profiler session
	 * @returns An unique id that should be used to make subsequent calls to this service
	 */
	registerSession(uri: string, connectionProfile: IConnectionProfile, session: IProfilerSession): ProfilerSessionID;
	/**
	 * Connects the session specified by the id
	 */
	connectSession(sessionId: ProfilerSessionID): Thenable<boolean>;
	/**
	 * Disconnected the session specified by the id
	 */
	disconnectSession(sessionId: ProfilerSessionID): Thenable<boolean>;
	/**
	 * Creates a new XEvent session with given session name and create statement
	 * sends events from the new XEvent session to the profiler session specified by the id
	 */
	createSession(profilerSessionId: string, createStatement: string, xEventSessionName: string): Thenable<sqlops.CreateProfilerSessionResponse>;
	/**
	 * Starts the XEvent session specified by the XEvent session name
	 * sends events from the started XEvent session to the profiler session specified by the id
	 */
	startSession(profilerSessionId: string, xEventSessionName: string): Thenable<sqlops.StartProfilingResponse>;
	/**
	 * Toggles the pause state of the profiler session specified by the id
	 */
	pauseSession(profilerSessionId: ProfilerSessionID): Thenable<boolean>;
	/**
	 * Stops the XEvent session being monitored by the profiler session specified by the id
	 */
	stopSession(profilerSessionId: ProfilerSessionID): Thenable<boolean>;
	/**
	 * Gets a list of all available XEvent sessions for the target that the specified profiler session is connected to
	 */
	listAvailableSessions(profilerSessionId: string): Thenable<sqlops.ListAvailableSessionsResponse>;
	/**
	 * The method called by the service provider for when more rows are available to render
	 */
	onMoreRows(params: sqlops.ProfilerSessionEvents): void;
	/**
	 * The method called by the service provider for when more rows are available to render
	 */
	onSessionStopped(params: sqlops.ProfilerSessionStoppedNotification): void;
	/**
	 * Gets a list of the session templates that are specified in the settings
	 * @param provider An optional string to limit the session template to a specific provider
	 * @returns An array of session templates that match the provider passed, if passed, and generic ones (no provider specified),
	 * otherwise returns all session templates
	 */
	getSessionTemplates(providerId?: string): Array<IProfilerSessionTemplate>;
	/**
	 * Gets a list of the view templates that are specified in the settings
	 * @param provider An optional string to limit the view template to a specific provider
	 * @returns An array of view templates that match the provider passed, if passed, and generic ones (no provider specified),
	 * otherwise returns all view templates
	 */
	getViewTemplates(providerId?: string): Array<IProfilerViewTemplate>;
	/**
	 * Launches the dialog for editing the view columns of a profiler session template for the given input
	 * @param input input object that contains the necessary information which will be modified based on used input
	 */
	launchColumnEditor(input: ProfilerInput): Thenable<void>;
}

export interface IProfilerSettings {
	sessionTemplates: Array<IProfilerSessionTemplate>;
	viewTemplates: Array<IProfilerViewTemplate>;
}

export interface IColumnViewTemplate {
	name: string;
	width: string;
	eventsMapped: Array<string>;
}

export interface IProfilerViewTemplate {
	name: string;
	columns: Array<IColumnViewTemplate>;
}

export interface ISessionCreateStatementTemplate {
	versions: Array<string>;
	statement: string;
}

export interface IProfilerSessionTemplate {
	name: string;
	defaultView: string;
	createStatements: Array<ISessionCreateStatementTemplate>;
}
