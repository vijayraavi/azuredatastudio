/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!sql/parts/query/editor/media/queryEditor';

import { QueryInput } from 'sql/parts/query/common/queryInput';

import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { Dimension } from 'vs/base/browser/dom';
import { SplitView } from 'vs/base/browser/ui/splitview/splitview';
import * as DOM from 'vs/base/browser/dom';
import { EditorOptions } from 'vs/workbench/common/editor';
import { CancellationToken } from 'vs/base/common/cancellation';
import { TPromise } from 'vs/base/common/winjs.base';

export class QueryEditor extends BaseEditor {

	private splitView: SplitView;

	protected createEditor(parent: HTMLElement): void {
		this.splitView = new SplitView(parent);
	}

	public layout(dimension: Dimension): void {
		throw new Error('Method not implemented.');
	}

	public get input(): QueryInput {
		return this._input;
	}

	public setInput(input: QueryInput, options: EditorOptions, token: CancellationToken): Thenable<void> {
		const oldInput = this.input;
		super.setInput(input, options, token);

		if (oldInput && oldInput.matches(this.input)) {
			return TPromise.as(undefined);
		}
	}
}
