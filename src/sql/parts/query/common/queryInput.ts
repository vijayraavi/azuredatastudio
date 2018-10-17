/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from 'vs/workbench/common/editor';
import { IEditorModel } from 'vs/platform/editor/common/editor';
import { TPromise } from 'vs/base/common/winjs.base';

import { QueryResultsInput } from 'sql/parts/query/common/queryResultsInput';
import { Emitter, Event } from 'vs/base/common/event';

export class QueryInput extends EditorInput {
	public static readonly ID: string = 'workbench.editorinputs.queryInput';
	public static readonly SCHEMA: string = 'sql';

	private _onQuery = new Emitter();
	public readonly onQuery = this._onQuery.event;

	constructor(
		private _text: EditorInput, private _results: QueryResultsInput
	) {
		super();
	}

	get text(): EditorInput {
		return this._text;
	}

	get results(): QueryResultsInput {
		return this._results;
	}

	public getTypeId(): string { return QueryInput.ID; }
	public supportsSplitEditor(): boolean { return false; }

	public resolve(): TPromise<IEditorModel> {
		return TPromise.as(null);
	}

	public get uri(): string {
		return '';
	}

	public runQuery() {
		this._onQuery.fire();
	}

	matches(otherInput: any): boolean {
		if (super.matches(otherInput) === true) {
			return true;
		}

		if (otherInput) {
			if (!(otherInput instanceof QueryInput)) {
				return false;
			}

			const otherDiffInput = <QueryInput>otherInput;
			return this.text.matches(otherDiffInput.text);
		}

		return false;
	}
}
