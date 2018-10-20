/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as editorCommon from 'vs/editor/common/editorCommon';
import * as editorBrowser from 'vs/editor/browser/editorBrowser';
import * as editorOptions from 'vs/editor/common/config/editorOptions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ITextModel, IIdentifiedSingleEditOperation, IModelDecoration, IModelDeltaDecoration, IModelDecorationsChangeAccessor } from 'vs/editor/common/model';
import { Selection, ISelection } from 'vs/editor/common/core/selection';
import { ICursors, CursorConfiguration } from 'vs/editor/common/controller/cursorCommon';
import { Range, IRange } from 'vs/editor/common/core/range';
import { IEditorWhitespace } from 'vs/editor/common/viewLayout/whitespaceComputer';
import { Position, IPosition } from 'vs/editor/common/core/position';

export class QueryEditorWidget implements editorBrowser.ICodeEditor {
	private _codeEditor: editorBrowser.ICodeEditor;

	public setCodeEditor(editor: editorBrowser.ICodeEditor) {
		this._codeEditor = editor;
	}

	private get codeEditor(): editorBrowser.ICodeEditor {
		return this._codeEditor;
	}

	public dispose(): void {
		this.codeEditor.dispose();
	}

	// #region codeeditor methods

	public get onDidChangeModelContent() { return this.codeEditor.onDidChangeModelContent; }
	public get onDidChangeModelLanguage() { return this.codeEditor.onDidChangeModelLanguage; }
	public get onDidChangeModelLanguageConfiguration() { return this.codeEditor.onDidChangeModelLanguageConfiguration; }
	public get onDidChangeModelOptions() { return this.codeEditor.onDidChangeModelOptions; }
	public get onDidChangeConfiguration() { return this.codeEditor.onDidChangeConfiguration; }
	public get onDidChangeCursorPosition() { return this.codeEditor.onDidChangeCursorPosition; }
	public get onDidChangeCursorSelection() { return this.codeEditor.onDidChangeCursorSelection; }
	public get onDidChangeModel() { return this.codeEditor.onDidChangeModel; }
	public get onDidChangeModelDecorations() { return this.codeEditor.onDidChangeModelDecorations; }
	public get onDidFocusEditorText() { return this.codeEditor.onDidFocusEditorText; }
	public get onDidBlurEditorText() { return this.codeEditor.onDidBlurEditorText; }
	public get onDidFocusEditorWidget() { return this.codeEditor.onDidFocusEditorWidget; }
	public get onDidBlurEditorWidget() { return this.codeEditor.onDidBlurEditorWidget; }
	public get onWillType() { return this.codeEditor.onWillType; }
	public get onDidType() { return this.codeEditor.onDidType; }
	public get onDidAttemptReadOnlyEdit() { return this.codeEditor.onDidAttemptReadOnlyEdit; }
	public get onDidPaste() { return this.codeEditor.onDidPaste; }
	public get onMouseUp() { return this.codeEditor.onMouseUp; }
	public get onMouseDown() { return this.codeEditor.onMouseDown; }
	public get onMouseDrag() { return this.codeEditor.onMouseDrag; }
	public get onMouseDrop() { return this.codeEditor.onMouseDrop; }
	public get onContextMenu() { return this.codeEditor.onContextMenu; }
	public get onMouseMove() { return this.codeEditor.onMouseMove; }
	public get onMouseLeave() { return this.codeEditor.onMouseLeave; }
	public get onKeyUp() { return this.codeEditor.onKeyUp; }
	public get onKeyDown() { return this.codeEditor.onKeyDown; }
	public get onDidLayoutChange() { return this.codeEditor.onDidLayoutChange; }
	public get isSimpleWidget(): boolean { return this.codeEditor.isSimpleWidget; }
	public get onDidScrollChange() { return this.codeEditor.onDidScrollChange; }
	public hasWidgetFocus(): boolean { return this.codeEditor.hasWidgetFocus(); }
	public getValue(options?: { preserveBOM: boolean; lineEnding: string; }): string { return this.codeEditor.getValue(options); }
	public setValue(newValue: string): void { return this.codeEditor.setValue(newValue); }
	public getScrollWidth(): number { return this.codeEditor.getScrollWidth(); }
	public getScrollLeft(): number { return this.codeEditor.getScrollLeft(); }
	public getScrollHeight(): number { return this.codeEditor.getScrollHeight(); }
	public getScrollTop(): number { return this.codeEditor.getScrollTop(); }
	public setScrollLeft(newScrollLeft: number): void { return this.codeEditor.setScrollLeft(newScrollLeft); }
	public setScrollTop(newScrollTop: number): void { return this.codeEditor.setScrollTop(newScrollTop); }
	public pushUndoStop(): boolean { return this.codeEditor.pushUndoStop(); }
	public removeDecorations(decorationTypeKey: string): void { return this.codeEditor.removeDecorations(decorationTypeKey); }
	public getTopForLineNumber(lineNumber: number): number { return this.codeEditor.getTopForLineNumber(lineNumber); }
	public getTopForPosition(lineNumber: number, column: number): number { return this.codeEditor.getTopForPosition(lineNumber, column); }
	public getTelemetryData(): { [key: string]: any; } { return this.codeEditor.getTelemetryData(); }
	public getDomNode(): HTMLElement { return this.codeEditor.getDomNode(); }
	public getOffsetForColumn(lineNumber: number, column: number): number { return this.codeEditor.getOffsetForColumn(lineNumber, column); }
	public render(): void { return this.codeEditor.render(); }
	public applyFontInfo(target: HTMLElement): void { return this.codeEditor.applyFontInfo(target); }
	public getId(): string { return this.codeEditor.getId(); }
	public getEditorType(): string { return this.codeEditor.getEditorType(); }
	public onVisible(): void { return this.codeEditor.onVisible(); }
	public onHide(): void { return this.codeEditor.onHide(); }
	public focus(): void { return this.codeEditor.focus(); }
	public hasTextFocus(): boolean { return this.codeEditor.hasTextFocus(); }
	public revealLine(lineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLine(lineNumber, scrollType); }
	public revealLineInCenter(lineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLineInCenter(lineNumber, scrollType); }
	public revealLineInCenterIfOutsideViewport(lineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLineInCenterIfOutsideViewport(lineNumber, scrollType); }
	public setSelection(something: any): void { return this.codeEditor.setSelection(something); }
	public setSelections(ranges: ISelection[]): void { return this.codeEditor.setSelections(ranges); }
	public revealLines(startLineNumber: number, endLineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLines(startLineNumber, endLineNumber, scrollType); }
	public revealLinesInCenter(startLineNumber: number, endLineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLinesInCenter(startLineNumber, endLineNumber, scrollType); }
	public revealLinesInCenterIfOutsideViewport(startLineNumber: number, endLineNumber: number, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType); }
	public trigger(source: string, handlerId: string, payload: any): void { return this.codeEditor.trigger(source, handlerId, payload); }
	public saveViewState(): editorCommon.ICodeEditorViewState { return this.codeEditor.saveViewState(); }
	public restoreViewState(s: editorCommon.ICodeEditorViewState): void { return this.codeEditor.restoreViewState(s); }
	public getContribution<T extends editorCommon.IEditorContribution>(id: string): T { return this.codeEditor.getContribution(id); }
	public invokeWithinContext<T>(fn: (accessor: ServicesAccessor) => T): T { return this.codeEditor.invokeWithinContext(fn); }
	public getModel(): ITextModel { return this.codeEditor.getModel(); }
	public getConfiguration(): editorOptions.InternalEditorOptions { return this.codeEditor.getConfiguration(); }
	public getRawConfiguration(): editorOptions.IEditorOptions { return this.codeEditor.getRawConfiguration(); }
	public setScrollPosition(position: editorCommon.INewScrollPosition): void { return this.codeEditor.setScrollPosition(position); }
	public getAction(id: string): editorCommon.IEditorAction { return this.codeEditor.getAction(id); }
	public executeCommand(source: string, command: editorCommon.ICommand): void { return this.codeEditor.executeCommand(source, command); }
	public executeEdits(source: string, edits: IIdentifiedSingleEditOperation[], endCursorState?: Selection[]): boolean { return this.codeEditor.executeEdits(source, edits, endCursorState); }
	public executeCommands(source: string, commands: editorCommon.ICommand[]): void { return this.codeEditor.executeCommands(source, commands); }
	public _getCursors(): ICursors { return this.codeEditor._getCursors(); }
	public _getCursorConfiguration(): CursorConfiguration { return this.codeEditor._getCursorConfiguration(); }
	public getLineDecorations(lineNumber: number): IModelDecoration[] { return this.codeEditor.getLineDecorations(lineNumber); }
	public deltaDecorations(oldDecorations: string[], newDecorations: IModelDeltaDecoration[]): string[] { return this.codeEditor.deltaDecorations(oldDecorations, newDecorations); }
	public setDecorations(decorationTypeKey: string, decorationOptions: editorCommon.IDecorationOptions[]): void { return this.codeEditor.setDecorations(decorationTypeKey, decorationOptions); }
	public setDecorationsFast(decorationTypeKey: string, ranges: IRange[]): void { return this.codeEditor.setDecorationsFast(decorationTypeKey, ranges); }
	public getLayoutInfo(): editorOptions.EditorLayoutInfo { return this.codeEditor.getLayoutInfo(); }
	public getVisibleRanges(): Range[] { return this.codeEditor.getVisibleRanges(); }
	public getWhitespaces(): IEditorWhitespace[] { return this.codeEditor.getWhitespaces(); }
	public setHiddenAreas(ranges: IRange[]): void { return this.codeEditor.setHiddenAreas(ranges); }
	public addContentWidget(widget: editorBrowser.IContentWidget): void { return this.codeEditor.addContentWidget(widget); }
	public layoutContentWidget(widget: editorBrowser.IContentWidget): void { return this.codeEditor.layoutContentWidget(widget); }
	public removeContentWidget(widget: editorBrowser.IContentWidget): void { return this.codeEditor.removeContentWidget(widget); }
	public addOverlayWidget(widget: editorBrowser.IOverlayWidget): void { return this.codeEditor.addOverlayWidget(widget); }
	public layoutOverlayWidget(widget: editorBrowser.IOverlayWidget): void { return this.codeEditor.layoutOverlayWidget(widget); }
	public removeOverlayWidget(widget: editorBrowser.IOverlayWidget): void { return this.codeEditor.removeOverlayWidget(widget); }
	public changeViewZones(callback: (accessor: editorBrowser.IViewZoneChangeAccessor) => void): void { return this.codeEditor.changeViewZones(callback); }
	public getTargetAtClientPoint(clientX: number, clientY: number): editorBrowser.IMouseTarget { return this.codeEditor.getTargetAtClientPoint(clientX, clientY); }
	public getScrolledVisiblePosition(rawPosition: IPosition): { top: number; left: number; height: number; } { return this.codeEditor.getScrolledVisiblePosition(rawPosition); }
	public get onDidDispose() { return this.codeEditor.onDidDispose; }
	public updateOptions(newOptions: editorOptions.IEditorOptions): void { return this.codeEditor.updateOptions(newOptions); }
	public layout(dimension?: editorCommon.IDimension): void { return this.codeEditor.layout(dimension); }
	public getSupportedActions(): editorCommon.IEditorAction[] { return this.codeEditor.getSupportedActions(); }
	public getVisibleColumnFromPosition(rawPosition: IPosition): number { return this.codeEditor.getVisibleColumnFromPosition(rawPosition); }
	public getPosition(): Position { return this.codeEditor.getPosition(); }
	public setPosition(position: IPosition): void { return this.codeEditor.setPosition(position); }
	public revealPosition(position: IPosition, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealPosition(position, scrollType); }
	public revealPositionInCenter(position: IPosition, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealPositionInCenter(position, scrollType); }
	public revealPositionInCenterIfOutsideViewport(position: IPosition, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealPositionInCenterIfOutsideViewport(position, scrollType); }
	public getSelection(): Selection { return this.codeEditor.getSelection(); }
	public getSelections(): Selection[] { return this.codeEditor.getSelections(); }
	public revealRange(range: IRange, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealRange(range, scrollType); }
	public revealRangeInCenter(range: IRange, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealRangeInCenter(range, scrollType); }
	public revealRangeAtTop(range: IRange, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealRangeAtTop(range, scrollType); }
	public revealRangeInCenterIfOutsideViewport(range: IRange, scrollType?: editorCommon.ScrollType): void { return this.codeEditor.revealRangeInCenterIfOutsideViewport(range, scrollType); }
	public changeDecorations(callback: (changeAccessor: IModelDecorationsChangeAccessor) => any): any { return this.codeEditor.changeDecorations(callback); }
	public setModel(model: ITextModel): void { return this.codeEditor.setModel(model); }

	// #endregion
}
