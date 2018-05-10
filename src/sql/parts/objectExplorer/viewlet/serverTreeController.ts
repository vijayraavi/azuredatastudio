/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import { ITree, ContextMenuEvent } from 'vs/base/parts/tree/browser/tree';
import { IWorkbenchEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IMouseEvent } from 'vs/base/browser/mouseEvent';
import { IKeyboardEvent } from 'vs/base/browser/keyboardEvent';
import { ConnectionProfileGroup } from 'sql/parts/connection/common/connectionProfileGroup';
import { ConnectionProfile } from 'sql/parts/connection/common/connectionProfile';
import { ServerTreeActionProvider } from 'sql/parts/objectExplorer/viewlet/serverTreeActionProvider';
import { ObjectExplorerActionsContext } from 'sql/parts/objectExplorer/viewlet/objectExplorerActions';
import { TreeNode } from 'sql/parts/objectExplorer/common/treeNode';
import { OpenMode, DefaultController, ClickBehavior } from 'vs/base/parts/tree/browser/treeDefaults';
import { IMenu, IMenuService, MenuId } from 'vs/platform/actions/common/actions';
import { WorkbenchTree } from 'vs/platform/list/browser/listService';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { fillInActions } from 'vs/platform/actions/browser/menuItemActionItem';
import { IAction } from 'vs/base/common/actions';
import { TPromise } from 'vs/base/common/winjs.base';

/**
 * Extends the tree controller to handle clicks on the tree elements
 */
export class ServerTreeController extends DefaultController implements IDisposable {

	private contributedContextMenu: IMenu;
	private toDispose: IDisposable[];

	constructor(private actionProvider: ServerTreeActionProvider,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@ITelemetryService private telemetryService: ITelemetryService,
		@IMenuService private menuService: IMenuService,
		@IKeybindingService private keybindingService: IKeybindingService
	) {
		super({
			clickBehavior: ClickBehavior.ON_MOUSE_DOWN,
			openMode: OpenMode.SINGLE_CLICK
		});

		this.toDispose = [];
	}

	public onClick(tree: ITree, element: any, event: IMouseEvent): boolean {
		return super.onClick(tree, element, event);
	}

	protected onLeftClick(tree: ITree, element: any, event: IMouseEvent, origin: string = 'mouse'): boolean {
		return super.onLeftClick(tree, element, event, origin);
	}

	// Do not allow left / right to expand and collapse groups #7848
	protected onLeft(tree: ITree, event: IKeyboardEvent): boolean {
		return true;
	}

	protected onRight(tree: ITree, event: IKeyboardEvent): boolean {
		return true;
	}

	protected onEnter(tree: ITree, event: IKeyboardEvent): boolean {
		return super.onEnter(tree, event);
	}

	/**
	 * Return actions in the context menu
	 */
	public onContextMenu(tree: WorkbenchTree, element: any, event: ContextMenuEvent): boolean {
		if (event.target && event.target.tagName && event.target.tagName.toLowerCase() === 'input') {
			return false;
		}
		// Check if clicked on some element
		if (element === tree.getInput()) {
			return false;
		}

		event.preventDefault();
		event.stopPropagation();

		tree.setFocus(element);
		let parent: ConnectionProfileGroup = undefined;
		if (element instanceof ConnectionProfileGroup) {
			parent = <ConnectionProfileGroup>element;
		}
		else if (element instanceof ConnectionProfile) {
			parent = (<ConnectionProfile>element).parent;
		}

		var actionContext: any;
		if (element instanceof TreeNode) {
			actionContext = new ObjectExplorerActionsContext();
			actionContext.container = event.target;
			actionContext.treeNode = <TreeNode>element;
			actionContext.tree = tree;
		} else if (element instanceof ConnectionProfile) {
			actionContext = new ObjectExplorerActionsContext();
			actionContext.container = event.target;
			actionContext.connectionProfile = <ConnectionProfile>element;
			actionContext.tree = tree;
		} else {
			actionContext = element;
		}

		if (!this.contributedContextMenu) {
			this.contributedContextMenu = this.menuService.createMenu(MenuId.ObjectExplorerContext, tree.contextKeyService);
			this.toDispose.push(this.contributedContextMenu);
		}

		let anchor = { x: event.posx + 1, y: event.posy };
		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => this.actionProvider.getActions(tree, element).then(actions => {
				fillInActions(this.contributedContextMenu, { shouldForwardArgs: true }, actions, this.contextMenuService);
				return actions;
			}),
			getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
			onHide: (wasCancelled?: boolean) => {
				if (wasCancelled) {
					tree.DOMFocus();
				}
			},
			getActionsContext: () => (actionContext)
		});

		return true;
	}

	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}
}