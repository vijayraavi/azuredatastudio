/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!sql/parts/query/editor/media/queryEditor';

import { QueryInput } from 'sql/parts/query/common/queryInput';
import { QueryResultsEditor } from 'sql/parts/query/editor/queryResultsEditor';

import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { SplitView, Orientation, Sizing } from 'vs/base/browser/ui/splitview/splitview';
import * as DOM from 'vs/base/browser/dom';
import { EditorOptions } from 'vs/workbench/common/editor';
import { CancellationToken } from 'vs/base/common/cancellation';
import { TPromise } from 'vs/base/common/winjs.base';
import { Emitter, Event } from 'vs/base/common/event';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { Registry } from 'vs/platform/registry/common/platform';
import { IEditorRegistry, Extensions } from 'vs/workbench/browser/editor';
import { $ } from 'vs/base/browser/builder';

const EditorRegistry = Registry.as<IEditorRegistry>(Extensions.Editors);

export class QueryEditor extends BaseEditor {
	public static readonly ID: string = 'workbench.editor.queryEditor';

	private dimension: DOM.Dimension = new DOM.Dimension(0, 0);

	private splitview: SplitView;
	// could be untitled or resource editor
	private textEditor: BaseEditor;
	private textEditorContainer: HTMLElement;
	private resultsEditor: QueryResultsEditor;
	private resultsEditorContainer: HTMLElement;

	private readonly _onFocus: Emitter<void> = new Emitter<void>();
	readonly onFocus: Event<void> = this._onFocus.event;


	private lastFocusedEditor: BaseEditor;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		super(QueryEditor.ID, telemetryService, themeService);
	}

	protected createEditor(parent: HTMLElement): void {
		DOM.addClass(parent, 'query-editor');

		this.splitview = new SplitView(parent, { orientation: Orientation.VERTICAL });
		this._register(this.splitview);
		this._register(this.splitview.onDidSashReset(() => this.splitview.distributeViewSizes()));

		this.textEditorContainer = DOM.$('.text-editor-container');

		this.splitview.addView({
			element: this.textEditorContainer,
			layout: size => this.textEditor && this.textEditor.layout(new DOM.Dimension(this.dimension.width, size)),
			minimumSize: 220,
			maximumSize: Number.POSITIVE_INFINITY,
			onDidChange: Event.None
		}, Sizing.Distribute);

		this.resultsEditorContainer = DOM.$('.results-editor-container');
		this.resultsEditor = this._register(this.instantiationService.createInstance(QueryResultsEditor));
		this.resultsEditor.create(this.resultsEditorContainer);
		(<CodeEditorWidget>this.resultsEditor.getControl()).onDidFocusEditorWidget(() => this.lastFocusedEditor = this.resultsEditor);

		/*
		this._register(attachStylerCallback(this.themeService, { scrollbarShadow }, colors => {
			const shadow = colors.scrollbarShadow ? colors.scrollbarShadow.toString() : null;

			if (shadow) {
				this.editablePreferencesEditorContainer.style.boxShadow = `-6px 0 5px -5px ${shadow}`;
			} else {
				this.editablePreferencesEditorContainer.style.boxShadow = null;
			}
		}));
		*/

		const focusTracker = this._register(DOM.trackFocus(parent));
		this._register(focusTracker.onDidFocus(() => this._onFocus.fire()));
	}

	public focus(): void {
		if (this.lastFocusedEditor) {
			this.lastFocusedEditor.focus();
		}
	}

	public layout(dimension: DOM.Dimension): void {
		this.dimension = dimension;
		this.splitview.layout(dimension.height);
	}

	public setInput(input: QueryInput, options: EditorOptions, token: CancellationToken): Thenable<void> {
		const oldInput = this.input;
		super.setInput(input, options, token);

		if (oldInput && oldInput.matches(this.input)) {
			return TPromise.as(undefined);
		}

		if (EditorRegistry.getEditor(this.input) !== EditorRegistry.getEditor(oldInput)) {
			this.createTextEditor();
		}

		return TPromise.join([
			this.textEditor.setInput(input.text, options, token),
			this.resultsEditor.setInput(input.results, options)
		]).then(() => undefined);
	}

	private createTextEditor() {
		if (this.textEditor) {
			this.textEditor.dispose();
			this.textEditor = undefined;
		}

		$(this.textEditorContainer).empty();
		let descriptor = EditorRegistry.getEditor(this.input);
		if (!descriptor) {
			return;
		}

		this.textEditor = descriptor.instantiate(this.instantiationService);
		this.textEditor.create(this.textEditorContainer);
		this.layout(this.dimension);
	}

	private createResultEditor() {
		this.splitview.addView({
			element: this.resultsEditorContainer,
			layout: size => this.resultsEditor && this.resultsEditor.layout(new DOM.Dimension(this.dimension.width, size)),
			minimumSize: 220,
			maximumSize: Number.POSITIVE_INFINITY,
			onDidChange: Event.None
		}, Sizing.Distribute);
	}
}
