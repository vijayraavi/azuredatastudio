/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { IJSONSchema } from 'vs/base/common/jsonSchema';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, IConfigurationNode } from 'vs/platform/configuration/common/configurationRegistry';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import * as nls from 'vs/nls';

import { ProfilerInput } from 'sql/parts/profiler/editor/profilerInput';
import { ProfilerEditor } from 'sql/parts/profiler/editor/profilerEditor';
import { PROFILER_SESSION_TEMPLATE_SETTINGS, PROFILER_VIEW_TEMPLATE_SETTINGS, IProfilerSessionTemplate, IProfilerViewTemplate } from 'sql/parts/profiler/service/interfaces';

const profilerDescriptor = new EditorDescriptor(
	ProfilerEditor,
	ProfilerEditor.ID,
	'ProfilerEditor'
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors)
	.registerEditor(profilerDescriptor, [new SyncDescriptor(ProfilerInput)]);

const profilerSessionTemplateSchema: IJSONSchema = {
	description: nls.localize('profiler.settings.sessionTemplates', "Specifies session templates"),
	type: 'array',
	items: <IJSONSchema>{
		type: 'object',
		properties: {
			name: {
				type: 'string'
			}
		}
	},
	default: <Array<IProfilerSessionTemplate>>[
		{
			name: 'Standard',
			defaultView: 'Standard_view',
			createStatements: [
				{
					versions: ['2012'],
					statement: ''
				},
				{
					versions: ['Cloud'],
					statement: ''
				}
			]
		}
	]
};

const profilerViewTemplateSchema: IJSONSchema = {
	description: nls.localize('profiler.settings.viewTemplates', "Specifies view templates"),
	type: 'array',
	items: <IJSONSchema>{
		type: 'object',
		properties: {
			name: {
				type: 'string'
			}
		}
	},
	default: <Array<IProfilerViewTemplate>>[
		{
			name: 'Standard_view',
			columns: [
				{
                    name: 'EventClass',
                    width: '1',
                    eventsMapped: ['name']
                },
                {
					name: 'TextData',
                    width: '1',
                    eventsMapped: ['options_text', 'batch_text']
                },
                {
					name: 'ApplicationName',
                    width: '1',
                    eventsMapped: ['client_app_name']
				},
                {
					name: 'NTUserName',
                    width: '1',
                    eventsMapped: ['nt_username']
                },
                {
					name: 'LoginName',
                    width: '1',
                    eventsMapped: ['server_principal_name']
                },
                {
					name: 'ClientProcessID',
                    width: '1',
                    eventsMapped: ['client_pid']
                },
                {
					name: 'SPID',
                    width: '1',
                    eventsMapped: ['session_id']
                },
                {
					name: 'StartTime',
                    width: '1',
                    eventsMapped: ['timestamp']
                },
                {
					name: 'CPU',
                    width: '1',
                    eventsMapped: ['cpu_time']
                },
                {
					name: 'Reads',
                    width: '1',
                    eventsMapped: ['logical_reads']
                },
                {
					name: 'Writes',
                    width: '1',
                    eventsMapped: ['writes']
                },
                {
					name: 'Duration',
                    width: '1',
                    eventsMapped: ['duration']
                },
                {
					name: 'EndTime',
                    width: '1',
                    eventsMapped: []
                },
                {
					name: 'BinaryData',
                    width: '1',
                    eventsMapped: []
                }
			]
		}
	]
};

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
const dashboardConfig: IConfigurationNode = {
	id: 'Profiler',
	type: 'object',
	properties: {
		[PROFILER_SESSION_TEMPLATE_SETTINGS]: profilerSessionTemplateSchema,
		[PROFILER_VIEW_TEMPLATE_SETTINGS]: profilerViewTemplateSchema
	}
};

configurationRegistry.registerConfiguration(dashboardConfig);
