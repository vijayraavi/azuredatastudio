/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!sql/parts/query/editor/media/queryEditor';

import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { Dimension } from 'vs/base/browser/dom';
import { SplitView } from 'vs/base/browser/ui/splitview/splitview';
import * as DOM from 'vs/base/browser/dom';

export class QueryEditor extends BaseEditor {

	private splitView: SplitView;

	protected createEditor(parent: HTMLElement): void {
		this.splitView = new SplitView(parent);
	}

	public layout(dimension: Dimension): void {
		throw new Error('Method not implemented.');
	}
}
