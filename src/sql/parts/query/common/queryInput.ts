/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput, ConfirmResult, EditorModel, Verbosity } from 'vs/workbench/common/editor';
import { TPromise } from 'vs/base/common/winjs.base';

import { QueryResultsInput } from 'sql/parts/query/common/queryResultsInput';
import { Emitter, Event } from 'vs/base/common/event';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import URI from 'vs/base/common/uri';
import { FileEditorInput } from 'vs/workbench/parts/files/common/editors/fileEditorInput';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';

const MAX_SIZE = 13;

function trimTitle(title: string): string {
	const length = title.length;
	const diff = length - MAX_SIZE;

	if (Math.sign(diff) <= 0) {
		return title;
	} else {
		const start = (length / 2) - (diff / 2);
		return title.slice(0, start) + '...' + title.slice(start + diff, length);
	}
}

export class QueryInput extends EditorInput {
	public static readonly ID: string = 'workbench.editorinputs.queryInput';
	public static readonly SCHEMA: string = 'sql';

	private _onQuery = new Emitter();
	public readonly onQuery = this._onQuery.event;

	constructor(
		private _text: FileEditorInput | UntitledEditorInput, private _results: QueryResultsInput
	) {
		super();
	}

	get text(): FileEditorInput | UntitledEditorInput {
		return this._text;
	}

	get results(): QueryResultsInput {
		return this._results;
	}

	public getTypeId(): string { return QueryInput.ID; }
	public supportsSplitEditor(): boolean { return false; }

	/* Shell methods that are needed to map the uri of the resource */
	public getTitle(verbosity: Verbosity) { return this.text.getTitle(verbosity); }
	public save(): TPromise<boolean> { return this.text.save(); }
	public isDirty(): boolean { return this.text.isDirty(); }
	public confirmSave(): TPromise<ConfirmResult> { return this.text.confirmSave(); }
	public getResource(): URI { return this.text.getResource(); }
	public getEncoding(): string {return this.text.getEncoding(); }
	public resolve(): TPromise<EditorModel> { return this.text.resolve(); }
	public getName(): string { return this.text.getName(); }

	/* These methods are also shell methods, but they only exist on UntitledEditorInputs */
	public get onDidModelChangeContent(): Event<void> {
		if (this.text instanceof UntitledEditorInput) {
			return this.text.onDidModelChangeContent;
		}
		return undefined;
	}

	public get onDidModelChangeEncoding(): Event<void> {
		if (this.text instanceof UntitledEditorInput) {
			return this.text.onDidModelChangeEncoding;
		}
		return undefined;
	}

	public suggestFileName(): string {
		if (this.text instanceof UntitledEditorInput) {
			return this.text.suggestFileName();
		}
		return undefined;
	}
	/* End shell methods */

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
