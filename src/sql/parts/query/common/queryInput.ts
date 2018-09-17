/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput, EditorModel } from 'vs/workbench/common/editor';
import { IEditorModel } from 'vs/platform/editor/common/editor';
import { TPromise } from 'vs/base/common/winjs.base';

export class QueryInput extends EditorInput {
	public static readonly ID: string = 'workbench.editorinputs.queryInput';
	public static readonly SCHEMA: string = 'sql';

	public getTypeId(): string { return QueryInput.ID; }

	public resolve(): TPromise<EditorModel> { }

	public supportsSplitEditor(): boolean { return false; }
}
