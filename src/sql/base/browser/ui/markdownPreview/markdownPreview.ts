/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { MarkdownContentProvider } from './markdown-language-features/features/previewContentProvider';
import { disposeAll } from './markdown-language-features/util/dispose';

import { getVisibleLine, MarkdownFileTopmostLineMonitor } from './markdown-language-features/util/topmostLineMonitor';
import { MarkdownPreviewConfigurationManager } from './markdown-language-features/features/previewConfig';
import { isMarkdownFile } from './markdown-language-features/util/file';

import { WebviewElement } from 'vs/workbench/parts/webview/electron-browser/webviewElement';
import { Disposable } from 'vs/base/common/lifecycle';
import { Parts, IPartService } from 'vs/workbench/services/part/common/partService';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { IThemeService } from 'vs/platform/theme/common/themeService';

export class MarkdownPreview extends Disposable {

	private _resource: vscode.Uri;
	private _locked: boolean;

	private readonly webview: WebviewElement;
	private throttleTimer: any;
	private line: number | undefined = undefined;
	private readonly disposables: vscode.Disposable[] = [];
	private firstUpdate = true;
	private currentVersion?: { resource: vscode.Uri, version: number };
	private forceUpdate = false;
	private isScrolling = false;
	private _disposed: boolean = false;

	private constructor(
		uri: string,
		private readonly _contentProvider: MarkdownContentProvider,
		private readonly _previewConfigurations: MarkdownPreviewConfigurationManager,
		topmostLineMonitor: MarkdownFileTopmostLineMonitor,
		parent: HTMLElement,
		@IPartService private partService: IPartService,
		@IThemeService private themeService: IThemeService,
		@IEnvironmentService private environmentService: IEnvironmentService,
		@IContextViewService private contextViewService: IContextViewService
	) {
		super();
		this._resource = vscode.Uri.file(uri);
		this._locked = false;
		this.webview = this._register(new WebviewElement(
			this.partService.getContainer(Parts.EDITOR_PART),
			this.themeService,
			this.environmentService,
			this.contextViewService,
			undefined,
			undefined,
			{
				allowScripts: true,
				enableWrappedPostMessage: true
			}
		));
		this.webview.mountTo(parent);

		this.webview.onMessage(e => {
			if (e.source !== this._resource.toString()) {
				return;
			}

			switch (e.type) {
				case 'command':
					vscode.commands.executeCommand(e.body.command, ...e.body.args);
					break;

				case 'revealLine':
					this.onDidScrollPreview(e.body.line);
					break;

				case 'didClick':
					this.onDidClickPreview(e.body.line);
					break;

			}
		}, null, this.disposables);

		vscode.workspace.onDidChangeTextDocument(event => {
			if (this.isPreviewOf(event.document.uri)) {
				this.refresh();
			}
		}, null, this.disposables);

		topmostLineMonitor.onDidChangeTopmostLine(event => {
			if (this.isPreviewOf(event.resource)) {
				this.updateForView(event.resource, event.line);
			}
		}, null, this.disposables);

		vscode.window.onDidChangeTextEditorSelection(event => {
			if (this.isPreviewOf(event.textEditor.document.uri)) {
				this.postMessage({
					type: 'onDidChangeTextEditorSelection',
					line: event.selections[0].active.line,
					source: this.resource.toString()
				});
			}
		}, null, this.disposables);

		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && isMarkdownFile(editor.document) && !this._locked) {
				this.update(editor.document.uri);
			}
		}, null, this.disposables);
	}

	private readonly _onDisposeEmitter = new vscode.EventEmitter<void>();
	public readonly onDispose = this._onDisposeEmitter.event;

	public get resource(): vscode.Uri {
		return this._resource;
	}

	public get state() {
		return {
			resource: this.resource.toString(),
			locked: this._locked,
			line: this.line
		};
	}

	public dispose() {
		super.dispose();
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		this._onDisposeEmitter.fire();

		this._onDisposeEmitter.dispose();
		disposeAll(this.disposables);
	}

	public update(resource: vscode.Uri) {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri.fsPath === resource.fsPath) {
			this.line = getVisibleLine(editor);
		}

		// If we have changed resources, cancel any pending updates
		const isResourceChange = resource.fsPath !== this._resource.fsPath;
		if (isResourceChange) {
			clearTimeout(this.throttleTimer);
			this.throttleTimer = undefined;
		}

		this._resource = resource;

		// Schedule update if none is pending
		if (!this.throttleTimer) {
			if (isResourceChange || this.firstUpdate) {
				this.doUpdate();
			} else {
				this.throttleTimer = setTimeout(() => this.doUpdate(), 300);
			}
		}

		this.firstUpdate = false;
	}

	public refresh() {
		this.forceUpdate = true;
		this.update(this._resource);
	}

	public updateConfiguration() {
		if (this._previewConfigurations.hasConfigurationChanged(this._resource)) {
			this.refresh();
		}
	}

	public isWebviewOf(webview: WebviewElement): boolean {
		return this.webview === webview;
	}

	public matchesResource(
		otherResource: vscode.Uri,
		otherLocked: boolean
	): boolean {
		if (this._locked) {
			return otherLocked && this.isPreviewOf(otherResource);
		} else {
			return !otherLocked;
		}
	}

	public matches(otherPreview: MarkdownPreview): boolean {
		return this.matchesResource(otherPreview._resource, otherPreview._locked);
	}

	public toggleLock() {
		this._locked = !this._locked;
	}

	private isPreviewOf(resource: vscode.Uri): boolean {
		return this._resource.fsPath === resource.fsPath;
	}

	private updateForView(resource: vscode.Uri, topLine: number | undefined) {
		if (!this.isPreviewOf(resource)) {
			return;
		}

		if (this.isScrolling) {
			this.isScrolling = false;
			return;
		}

		if (typeof topLine === 'number') {
			this.line = topLine;
			this.postMessage({
				type: 'updateView',
				line: topLine,
				source: resource.toString()
			});
		}
	}

	private postMessage(msg: any) {
		if (!this._disposed) {
			this.webview.sendMessage(msg);
		}
	}

	private async doUpdate(): Promise<void> {
		const resource = this._resource;

		clearTimeout(this.throttleTimer);
		this.throttleTimer = undefined;

		const document = await vscode.workspace.openTextDocument(resource);
		if (!this.forceUpdate && this.currentVersion && this.currentVersion.resource.fsPath === resource.fsPath && this.currentVersion.version === document.version) {
			if (this.line) {
				this.updateForView(resource, this.line);
			}
			return;
		}
		this.forceUpdate = false;

		this.currentVersion = { resource, version: document.version };
		const content = await this._contentProvider.provideTextDocumentContent(document, this._previewConfigurations, this.line);
		if (this._resource === resource) {
			this.webview.contents = content;
		}
	}

	private onDidScrollPreview(line: number) {
		this.line = line;
		for (const editor of vscode.window.visibleTextEditors) {
			if (!this.isPreviewOf(editor.document.uri)) {
				continue;
			}

			this.isScrolling = true;
			const sourceLine = Math.floor(line);
			const fraction = line - sourceLine;
			const text = editor.document.lineAt(sourceLine).text;
			const start = Math.floor(fraction * text.length);
			editor.revealRange(
				new vscode.Range(sourceLine, start, sourceLine + 1, 0),
				vscode.TextEditorRevealType.AtTop);
		}
	}

	private async onDidClickPreview(line: number): Promise<void> {
		for (const visibleEditor of vscode.window.visibleTextEditors) {
			if (this.isPreviewOf(visibleEditor.document.uri)) {
				const editor = await vscode.window.showTextDocument(visibleEditor.document, visibleEditor.viewColumn);
				const position = new vscode.Position(line, 0);
				editor.selection = new vscode.Selection(position, position);
				return;
			}
		}

		vscode.workspace.openTextDocument(this._resource).then(vscode.window.showTextDocument);
	}
}

export interface PreviewSettings {
	readonly resourceColumn: vscode.ViewColumn;
	readonly previewColumn: vscode.ViewColumn;
	readonly locked: boolean;
}
