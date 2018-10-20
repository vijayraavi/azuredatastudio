/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!sql/parts/query/editor/media/queryEditor';

import { QueryInput } from 'sql/parts/query/common/queryInput';
import { QueryResultsEditor } from 'sql/parts/query/editor/queryResultsEditor';
import { QueryEditorActionBar } from 'sql/parts/query/editor/queryEditorActionBar';
import { QueryEditorWidget } from 'sql/parts/query/editor/queryEditorWidget';

import { BaseEditor } from 'vs/workbench/browser/parts/editor/baseEditor';
import { SplitView, Orientation, Sizing } from 'vs/base/browser/ui/splitview/splitview';
import * as DOM from 'vs/base/browser/dom';
import { EditorOptions, IEditorControl, IEditorMemento } from 'vs/workbench/common/editor';
import { CancellationToken } from 'vs/base/common/cancellation';
import { TPromise } from 'vs/base/common/winjs.base';
import { Emitter, Event, once } from 'vs/base/common/event';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IEditorRegistry, Extensions } from 'vs/workbench/browser/editor';
import { $ } from 'vs/base/browser/builder';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IEditorGroupsService, IEditorGroup } from 'vs/workbench/services/group/common/editorGroupsService';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import URI from 'vs/base/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';

const EditorRegistry = Registry.as<IEditorRegistry>(Extensions.Editors);

export interface IQueryEditorViewState {
	resultsEditorVisible: boolean;
	textEditorHeight: number;
}

const QUERY_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'queryEditorViewState';

export class QueryEditor extends BaseEditor {
	public static readonly ID: string = 'workbench.editor.queryEditor';

	private dimension: DOM.Dimension = new DOM.Dimension(0, 0);

	private _editor: QueryEditorWidget;

	private splitview: SplitView;
	// could be untitled or resource editor
	private textEditor: BaseEditor;
	private textEditorContainer: HTMLElement;
	private resultsEditor: QueryResultsEditor;
	private resultsEditorContainer: HTMLElement;
	private taskbar: QueryEditorActionBar;
	private editorMemento: IEditorMemento<IQueryEditorViewState>;

	private readonly _onFocus: Emitter<void> = new Emitter<void>();
	readonly onFocus: Event<void> = this._onFocus.event;

	private lastFocusedEditor: BaseEditor;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService
	) {
		super(QueryEditor.ID, telemetryService, themeService);

		this.editorMemento = this.getEditorMemento<IQueryEditorViewState>(storageService, editorGroupService, QUERY_EDITOR_VIEW_STATE_PREFERENCE_KEY, 100);
	}

	public get input(): QueryInput {
		return this._input as QueryInput;
	}

	protected createEditor(parent: HTMLElement): void {
		DOM.addClass(parent, 'query-editor');

		this._editor = new QueryEditorWidget();

		let splitviewContainer = DOM.$('.query-editor-view');

		let taskbarContainer = DOM.$('.query-editor-taskbar');
		this.taskbar = this.instantiationService.createInstance(QueryEditorActionBar, taskbarContainer);
		this.taskbar.editor = this.getControl() as ICodeEditor;
		parent.appendChild(taskbarContainer);
		parent.appendChild(splitviewContainer);

		this.splitview = new SplitView(splitviewContainer, { orientation: Orientation.VERTICAL });
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
		this.resultsEditor.setVisible(this.isVisible(), this.group);
		// (<CodeEditorWidget>this.resultsEditor.getControl()).onDidFocusEditorWidget(() => this.lastFocusedEditor = this.resultsEditor);

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

	public getControl(): IEditorControl {
		return this._editor;
	}

	public layout(dimension: DOM.Dimension): void {
		this.dimension = dimension;
		// acount for taskbar height
		this.splitview.layout(dimension.height - DOM.getTotalHeight(this.taskbar.getContainer().getHTMLElement()));
	}

	public setInput(input: QueryInput, options: EditorOptions, token: CancellationToken): Thenable<void> {

		// Remember view settings if input changes
		this.saveQueryEditorViewState(this.input);

		const oldInput = this.input;
		super.setInput(input, options, token);

		if (oldInput && oldInput.matches(this.input)) {
			return TPromise.as(undefined);
		}

		this.input.onQuery(() => this.addResultsEditor());

		if (!oldInput || EditorRegistry.getEditor(this.input) !== EditorRegistry.getEditor(oldInput)) {
			this.createTextEditor();
		}

		return TPromise.join([
			this.taskbar.setInput(input),
			this.textEditor.setInput(input.text, options, token),
			this.resultsEditor.setInput(input.results, options)
		]).then(() => undefined);
	}

	clearInput(): void {

		// Keep editor view state in settings to restore when coming back
		this.saveQueryEditorViewState(this.input);

		if (this.textEditor) {
			this.textEditor.clearInput();
		}

		if (this.resultsEditor) {
			this.resultsEditor.clearInput();
		}

		super.clearInput();
	}

	shutdown() {
		if (this.textEditor) {
			this.textEditor.shutdown();
		}

		if (this.resultsEditor) {
			this.resultsEditor.shutdown();
		}

		super.shutdown();
	}

	setOptions(options: EditorOptions): void {
		if (this.textEditor) {
			this.textEditor.setOptions(options);
		}

		if (this.resultsEditor) {
			this.resultsEditor.setOptions(options);
		}

		super.setOptions(options);
	}

	protected setEditorVisible(visible: boolean, group: IEditorGroup): void {

		// Pass on to Editor
		if (this.textEditor) {
			this.textEditor.setVisible(visible, group);
		}

		if (this.resultsEditor) {
			this.resultsEditor.setVisible(visible, group);
		}

		super.setEditorVisible(visible, group);
	}

	private saveQueryEditorViewState(input: QueryInput): void {
		if (!input || (!(input.text instanceof UntitledEditorInput) && !(input.text instanceof ResourceEditorInput))) {
			return; // only enabled for untitled and resource inputs
		}

		const resource = input.getResource();

		// Clear view state if input is disposed
		if (input.isDisposed()) {
			this.clearQueryEditorViewState([resource]);
		}

		// Otherwise save it
		else {

			const editorViewState = this.retrieveQueryEditorViewState(resource);
			if (!editorViewState) {
				return;
			}

			this.editorMemento.saveState(this.group, resource, editorViewState);

			// Make sure to clean up when the input gets disposed
			once(input.onDispose)(() => {
				this.clearQueryEditorViewState([resource]);
			});
		}
	}

	protected retrieveQueryEditorViewState(resource: URI): IQueryEditorViewState {
		/*
		const control = this.getControl() as ICodeEditor;
		const model = control.getModel();
		if (!model) {
			return null; // view state always needs a model
		}

		const modelUri = model.uri;
		if (!modelUri) {
			return null; // model URI is needed to make sure we save the view state correctly
		}

		if (modelUri.toString() !== resource.toString()) {
			return null; // prevent saving view state for a model that is not the expected one
		}

		return control.saveViewState();
		*/
		return undefined;
	}

	/**
	 * Clears the text editor view state for the given resources.
	 */
	protected clearQueryEditorViewState(resources: URI[]): void {
		resources.forEach(resource => {
			this.editorMemento.clearState(resource);
		});
	}

	private createTextEditor() {
		if (this.textEditor) {
			this.textEditor.dispose();
			this.textEditor = undefined;
		}

		$(this.textEditorContainer).empty();
		let descriptor = EditorRegistry.getEditor(this.input.text);
		if (!descriptor) {
			return;
		}

		this.textEditor = descriptor.instantiate(this.instantiationService);
		this.textEditor.create(this.textEditorContainer);
		this._editor.setCodeEditor(this.textEditor.getControl() as ICodeEditor);
		this.textEditor.setVisible(this.isVisible(), this.group);
		this.layout(this.dimension);
	}

	private removeResultsEditor() {
		this.splitview.removeView(1, Sizing.Distribute);
	}

	private addResultsEditor() {
		this.splitview.addView({
			element: this.resultsEditorContainer,
			layout: size => this.resultsEditor && this.resultsEditor.layout(new DOM.Dimension(this.dimension.width, size)),
			minimumSize: 220,
			maximumSize: Number.POSITIVE_INFINITY,
			onDidChange: Event.None
		}, Sizing.Distribute);
	}
}
