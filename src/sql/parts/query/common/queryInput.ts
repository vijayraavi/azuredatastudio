/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput, ConfirmResult, EditorModel, Verbosity, EncodingMode } from 'vs/workbench/common/editor';
import { TPromise } from 'vs/base/common/winjs.base';
import { Emitter, Event } from 'vs/base/common/event';
import URI from 'vs/base/common/uri';
import { FileEditorInput } from 'vs/workbench/parts/files/common/editors/fileEditorInput';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';
import { IRange } from 'vs/editor/common/core/range';

import { QueryResultsInput } from 'sql/parts/query/common/queryResultsInput';
import QueryRunner from 'sql/parts/query/execution/queryRunner';

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

	private _runner: QueryRunner;

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

	// Clean up functions
	public dispose(): void {
		// this._queryModelService.disposeQuery(this.uri);
		this.text.dispose();
		this.results.dispose();
		super.dispose();
	}

	public get uri(): string {
		return this.getResource().toString();
	}

	public close(): void {
		this.text.close();
		this.results.close();
	}

	// #region shell methods
	/* Shell methods that are needed to map the uri of the resource */
	public getTitle(verbosity: Verbosity) { return this.text.getTitle(verbosity); }
	public save(): TPromise<boolean> { return this.text.save(); }
	public isDirty(): boolean { return this.text.isDirty(); }
	public confirmSave(): TPromise<ConfirmResult> { return this.text.confirmSave(); }
	public getResource(): URI { return this.text.getResource(); }
	public getEncoding(): string { return this.text.getEncoding(); }
	public resolve(): TPromise<EditorModel> { return this.text.resolve(); }
	public getName(): string { return this.text.getName(); }

	public setEncoding(encoding: string, mode: EncodingMode): void {
		this.text.setEncoding(encoding, mode);
	}


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

	public get hasAssociatedFilePath(): boolean {
		if (this.text instanceof UntitledEditorInput) {
			return this.text.hasAssociatedFilePath;
		}
		return undefined;
	}

	// #endregion

	public runQuery(selection?: IRange) {
		this._onQuery.fire();
	}


	public matches(otherInput: any): boolean {
		if (otherInput instanceof QueryInput) {
			return this.text.matches(otherInput.text);
		}

		return this.text.matches(otherInput);
	}
}
