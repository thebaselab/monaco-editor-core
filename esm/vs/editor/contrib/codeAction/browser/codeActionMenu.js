/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as dom from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { canceled } from '../../../../base/common/errors.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, dispose, MutableDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import './media/action.css';
import { Position } from '../../../common/core/position.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { codeActionCommandId, CodeActionItem, fixAllCommandId, organizeImportsCommandId, refactorCommandId, sourceActionCommandId } from './codeAction.js';
import { CodeActionCommandArgs, CodeActionKind, CodeActionTriggerSource } from './types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import '../../symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { Codicon } from '../../../../base/common/codicons.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
export const Context = {
    Visible: new RawContextKey('codeActionMenuVisible', false, localize('codeActionMenuVisible', "Whether the code action list widget is visible"))
};
class CodeActionAction extends Action {
    constructor(action, callback) {
        super(action.command ? action.command.id : action.title, stripNewlines(action.title), undefined, !action.disabled, callback);
        this.action = action;
    }
}
function stripNewlines(str) {
    return str.replace(/\r\n|\r|\n/g, ' ');
}
const TEMPLATE_ID = 'codeActionWidget';
const codeActionLineHeight = 24;
const headerLineHeight = 26;
// TODO: Take a look at user storage for this so it is preserved across windows and on reload.
let showDisabled = false;
let CodeMenuRenderer = class CodeMenuRenderer {
    constructor(acceptKeybindings, keybindingService) {
        this.acceptKeybindings = acceptKeybindings;
        this.keybindingService = keybindingService;
    }
    get templateId() { return TEMPLATE_ID; }
    renderTemplate(container) {
        const data = Object.create(null);
        data.disposables = [];
        data.root = container;
        data.text = document.createElement('span');
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-container';
        data.icon = document.createElement('div');
        iconContainer.append(data.icon);
        container.append(iconContainer);
        container.append(data.text);
        return data;
    }
    renderElement(element, index, templateData) {
        var _a, _b;
        const data = templateData;
        const isSeparator = element.isSeparator;
        const isHeader = element.isHeader;
        // Renders differently based on element type.
        if (isSeparator) {
            data.root.classList.add('separator');
            data.root.style.height = '10px';
        }
        else if (isHeader) {
            const text = element.headerTitle;
            data.text.textContent = text;
            element.isEnabled = false;
            data.root.classList.add('group-header');
        }
        else {
            const text = element.action.label;
            element.isEnabled = element.action.enabled;
            if (element.action instanceof CodeActionAction) {
                const openedFromString = ((_a = element.params) === null || _a === void 0 ? void 0 : _a.options.fromLightbulb) ? CodeActionTriggerSource.Lightbulb : (_b = element.params) === null || _b === void 0 ? void 0 : _b.trigger.triggerAction;
                // Check documentation type
                element.isDocumentation = element.action.action.kind === CodeActionMenu.documentationID;
                if (element.isDocumentation) {
                    element.isEnabled = false;
                    data.root.classList.add('documentation');
                    const container = data.root;
                    const actionbarContainer = dom.append(container, dom.$('.codeActionWidget-action-bar'));
                    const reRenderAction = showDisabled ?
                        {
                            id: 'hideMoreCodeActions',
                            label: localize('hideMoreCodeActions', 'Hide Disabled'),
                            enabled: true,
                            run: () => CodeActionMenu.toggleDisabledOptions(element.params)
                        } :
                        {
                            id: 'showMoreCodeActions',
                            label: localize('showMoreCodeActions', 'Show Disabled'),
                            enabled: true,
                            run: () => CodeActionMenu.toggleDisabledOptions(element.params)
                        };
                    const actionbar = new ActionBar(actionbarContainer);
                    data.disposables.push(actionbar);
                    if (openedFromString === CodeActionTriggerSource.Refactor && (element.params.codeActions.validActions.length > 0 || element.params.codeActions.allActions.length === element.params.codeActions.validActions.length)) {
                        actionbar.push([element.action, reRenderAction], { icon: false, label: true });
                    }
                    else {
                        actionbar.push([element.action], { icon: false, label: true });
                    }
                }
                else {
                    data.text.textContent = text;
                    // Icons and Label modifaction based on group
                    const group = element.action.action.kind;
                    if (CodeActionKind.SurroundWith.contains(new CodeActionKind(String(group)))) {
                        data.icon.className = Codicon.symbolArray.classNames;
                    }
                    else if (CodeActionKind.Extract.contains(new CodeActionKind(String(group)))) {
                        data.icon.className = Codicon.wrench.classNames;
                    }
                    else if (CodeActionKind.Convert.contains(new CodeActionKind(String(group)))) {
                        data.icon.className = Codicon.zap.classNames;
                        data.icon.style.color = `var(--vscode-editorLightBulbAutoFix-foreground)`;
                    }
                    else if (CodeActionKind.QuickFix.contains(new CodeActionKind(String(group)))) {
                        data.icon.className = Codicon.lightBulb.classNames;
                        data.icon.style.color = `var(--vscode-editorLightBulb-foreground)`;
                    }
                    else {
                        data.icon.className = Codicon.lightBulb.classNames;
                        data.icon.style.color = `var(--vscode-editorLightBulb-foreground)`;
                    }
                    // Check if action has disabled reason
                    if (element.action.action.disabled) {
                        data.root.title = element.action.action.disabled;
                    }
                    else {
                        const updateLabel = () => {
                            var _a, _b;
                            const [accept, preview] = this.acceptKeybindings;
                            data.root.title = localize({ key: 'label', comment: ['placeholders are keybindings, e.g "F2 to Apply, Shift+F2 to Preview"'] }, "{0} to Apply, {1} to Preview", (_a = this.keybindingService.lookupKeybinding(accept)) === null || _a === void 0 ? void 0 : _a.getLabel(), (_b = this.keybindingService.lookupKeybinding(preview)) === null || _b === void 0 ? void 0 : _b.getLabel());
                        };
                        updateLabel();
                    }
                }
            }
        }
        if (!element.isEnabled) {
            data.root.classList.add('option-disabled');
            data.root.style.backgroundColor = 'transparent !important';
            data.icon.style.opacity = '0.4';
        }
        else {
            data.root.classList.remove('option-disabled');
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables = dispose(templateData.disposables);
    }
};
CodeMenuRenderer = __decorate([
    __param(1, IKeybindingService)
], CodeMenuRenderer);
let CodeActionMenu = class CodeActionMenu extends Disposable {
    constructor(_editor, _delegate, _contextMenuService, keybindingService, _languageFeaturesService, _telemetryService, _themeService, _configurationService, _contextViewService, _contextKeyService) {
        super();
        this._editor = _editor;
        this._delegate = _delegate;
        this._contextMenuService = _contextMenuService;
        this._languageFeaturesService = _languageFeaturesService;
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._showingActions = this._register(new MutableDisposable());
        this.codeActionList = this._register(new MutableDisposable());
        this.options = [];
        this._visible = false;
        this.viewItems = [];
        this.hasSeparator = false;
        this._keybindingResolver = new CodeActionKeybindingResolver({
            getKeybindings: () => keybindingService.getKeybindings()
        });
        this._ctxMenuWidgetVisible = Context.Visible.bindTo(this._contextKeyService);
        this.listRenderer = new CodeMenuRenderer([`onEnterSelectCodeAction`, `onEnterSelectCodeActionWithPreview`], keybindingService);
    }
    get isVisible() {
        return this._visible;
    }
    /**
     * Checks if the settings have enabled the new code action widget.
     */
    isCodeActionWidgetEnabled(model) {
        return this._configurationService.getValue('editor.useCustomCodeActionMenu', {
            resource: model.uri
        });
    }
    /**
    * Checks if the setting has disabled/enabled headers in the code action widget.
    */
    isCodeActionWidgetHeadersShown(model) {
        return this._configurationService.getValue('editor.customCodeActionMenu.showHeaders', {
            resource: model.uri
        });
    }
    _onListSelection(e) {
        if (e.elements.length) {
            e.elements.forEach(element => {
                if (element.isEnabled) {
                    element.action.run();
                    this.hideCodeActionWidget();
                }
            });
        }
    }
    _onListHover(e) {
        var _a, _b, _c, _d;
        if (!e.element) {
            this.currSelectedItem = undefined;
            (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.setFocus([]);
        }
        else {
            if ((_b = e.element) === null || _b === void 0 ? void 0 : _b.isEnabled) {
                (_c = this.codeActionList.value) === null || _c === void 0 ? void 0 : _c.setFocus([e.element.index]);
                this.focusedEnabledItem = this.viewItems.indexOf(e.element);
                this.currSelectedItem = e.element.index;
            }
            else {
                this.currSelectedItem = undefined;
                (_d = this.codeActionList.value) === null || _d === void 0 ? void 0 : _d.setFocus([e.element.index]);
            }
        }
    }
    _onListClick(e) {
        var _a;
        if (e.element) {
            if (!e.element.isEnabled) {
                this.currSelectedItem = undefined;
                (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.setFocus([]);
            }
        }
    }
    /**
     * Renders the code action widget given the provided actions.
     */
    renderCodeActionMenuList(element, inputArray, params) {
        var _a;
        const renderDisposables = new DisposableStore();
        const renderMenu = document.createElement('div');
        // Render invisible div to block mouse interaction in the rest of the UI
        const menuBlock = document.createElement('div');
        this.block = element.appendChild(menuBlock);
        this.block.classList.add('context-view-block');
        this.block.style.position = 'fixed';
        this.block.style.cursor = 'initial';
        this.block.style.left = '0';
        this.block.style.top = '0';
        this.block.style.width = '100%';
        this.block.style.height = '100%';
        this.block.style.zIndex = '-1';
        renderDisposables.add(dom.addDisposableListener(this.block, dom.EventType.MOUSE_DOWN, e => e.stopPropagation()));
        renderMenu.id = 'codeActionMenuWidget';
        renderMenu.classList.add('codeActionMenuWidget');
        element.appendChild(renderMenu);
        this.codeActionList.value = new List('codeActionWidget', renderMenu, {
            getHeight(element) {
                if (element.isSeparator) {
                    return 10;
                }
                else if (element.isHeader) {
                    return headerLineHeight;
                }
                return codeActionLineHeight;
            },
            getTemplateId(element) {
                return 'codeActionWidget';
            }
        }, [this.listRenderer], {
            keyboardSupport: false,
            accessibilityProvider: {
                getAriaLabel: element => {
                    if (element.action instanceof CodeActionAction) {
                        let label = element.action.label;
                        if (!element.action.enabled) {
                            if (element.action instanceof CodeActionAction) {
                                label = localize({ key: 'customCodeActionWidget.labels', comment: ['Code action labels for accessibility.'] }, "{0}, Disabled Reason: {1}", label, element.action.action.disabled);
                            }
                        }
                        return label;
                    }
                    return null;
                },
                getWidgetAriaLabel: () => localize({ key: 'customCodeActionWidget', comment: ['A Code Action Option'] }, "Code Action Widget"),
                getRole: () => 'option',
                getWidgetRole: () => 'code-action-widget'
            }
        });
        const pointerBlockDiv = document.createElement('div');
        this.pointerBlock = element.appendChild(pointerBlockDiv);
        this.pointerBlock.classList.add('context-view-pointerBlock');
        this.pointerBlock.style.position = 'fixed';
        this.pointerBlock.style.cursor = 'initial';
        this.pointerBlock.style.left = '0';
        this.pointerBlock.style.top = '0';
        this.pointerBlock.style.width = '100%';
        this.pointerBlock.style.height = '100%';
        this.pointerBlock.style.zIndex = '2';
        // Removes block on click INSIDE widget or ANY mouse movement
        renderDisposables.add(dom.addDisposableListener(this.pointerBlock, dom.EventType.POINTER_MOVE, () => { var _a; return (_a = this.pointerBlock) === null || _a === void 0 ? void 0 : _a.remove(); }));
        renderDisposables.add(dom.addDisposableListener(this.pointerBlock, dom.EventType.MOUSE_DOWN, () => { var _a; return (_a = this.pointerBlock) === null || _a === void 0 ? void 0 : _a.remove(); }));
        renderDisposables.add(this.codeActionList.value.onMouseClick(e => this._onListClick(e)));
        renderDisposables.add(this.codeActionList.value.onMouseOver(e => this._onListHover(e)));
        renderDisposables.add(this.codeActionList.value.onDidChangeFocus(() => { var _a; return (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.domFocus(); }));
        renderDisposables.add(this.codeActionList.value.onDidChangeSelection(e => this._onListSelection(e)));
        renderDisposables.add(this._editor.onDidLayoutChange(() => this.hideCodeActionWidget()));
        const model = this._editor.getModel();
        if (!model) {
            return renderDisposables;
        }
        let numHeaders = 0;
        const totalActionEntries = [];
        // Checks if headers are disabled.
        if (!this.isCodeActionWidgetHeadersShown(model)) {
            totalActionEntries.push(...inputArray);
        }
        else {
            // Filters and groups code actions by their group
            const menuEntries = [];
            // Code Action Groups
            const quickfixGroup = [];
            const extractGroup = [];
            const convertGroup = [];
            const surroundGroup = [];
            const sourceGroup = [];
            const separatorGroup = [];
            const documentationGroup = [];
            const otherGroup = [];
            inputArray.forEach((item) => {
                if (item instanceof CodeActionAction) {
                    const optionKind = item.action.kind;
                    if (CodeActionKind.SurroundWith.contains(new CodeActionKind(String(optionKind)))) {
                        surroundGroup.push(item);
                    }
                    else if (CodeActionKind.QuickFix.contains(new CodeActionKind(String(optionKind)))) {
                        quickfixGroup.push(item);
                    }
                    else if (CodeActionKind.Extract.contains(new CodeActionKind(String(optionKind)))) {
                        extractGroup.push(item);
                    }
                    else if (CodeActionKind.Convert.contains(new CodeActionKind(String(optionKind)))) {
                        convertGroup.push(item);
                    }
                    else if (CodeActionKind.Source.contains(new CodeActionKind(String(optionKind)))) {
                        sourceGroup.push(item);
                    }
                    else if (optionKind === CodeActionMenu.documentationID) {
                        documentationGroup.push(item);
                    }
                    else {
                        // Pushes all the other actions to the "Other" group
                        otherGroup.push(item);
                    }
                }
                else if (item.id === `vs.actions.separator`) {
                    separatorGroup.push(item);
                }
            });
            menuEntries.push(quickfixGroup, extractGroup, convertGroup, surroundGroup, sourceGroup, otherGroup, separatorGroup, documentationGroup);
            const menuEntriesToPush = (menuID, entry) => {
                totalActionEntries.push(menuID);
                totalActionEntries.push(...entry);
                numHeaders++;
            };
            // Creates flat list of all menu entries with headers as separators
            menuEntries.forEach(entry => {
                if (entry.length > 0 && entry[0] instanceof CodeActionAction) {
                    const firstAction = entry[0].action.kind;
                    if (CodeActionKind.SurroundWith.contains(new CodeActionKind(String(firstAction)))) {
                        menuEntriesToPush(localize('codeAction.widget.id.surround', 'Surround With...'), entry);
                    }
                    else if (CodeActionKind.QuickFix.contains(new CodeActionKind(String(firstAction)))) {
                        menuEntriesToPush(localize('codeAction.widget.id.quickfix', 'Quick Fix...'), entry);
                    }
                    else if (CodeActionKind.Extract.contains(new CodeActionKind(String(firstAction)))) {
                        menuEntriesToPush(localize('codeAction.widget.id.extract', 'Extract...'), entry);
                    }
                    else if (CodeActionKind.Convert.contains(new CodeActionKind(String(firstAction)))) {
                        menuEntriesToPush(localize('codeAction.widget.id.convert', 'Convert...'), entry);
                    }
                    else if (CodeActionKind.Source.contains(new CodeActionKind(String(firstAction)))) {
                        menuEntriesToPush(localize('codeAction.widget.id.source', 'Source Action...'), entry);
                    }
                    else if (firstAction === CodeActionMenu.documentationID) {
                        totalActionEntries.push(...entry);
                    }
                    else {
                        // Takes and flattens all the `other` actions
                        menuEntriesToPush(localize('codeAction.widget.id.more', 'More Actions...'), entry);
                    }
                }
                else {
                    // case for separator - separators are not codeActionAction typed
                    totalActionEntries.push(...entry);
                }
            });
        }
        // Populating the list widget and tracking enabled options.
        totalActionEntries.forEach((item, index) => {
            if (typeof item === `string`) {
                const menuItem = { isEnabled: false, isSeparator: false, index, isHeader: true, headerTitle: item };
                this.options.push(menuItem);
            }
            else {
                const currIsSeparator = item.class === 'separator';
                if (currIsSeparator) {
                    // set to true forever because there is a separator
                    this.hasSeparator = true;
                }
                const menuItem = { action: item, isEnabled: item.enabled, isSeparator: currIsSeparator, index, params };
                if (item.enabled) {
                    this.viewItems.push(menuItem);
                }
                this.options.push(menuItem);
            }
        });
        this.codeActionList.value.splice(0, this.codeActionList.value.length, this.options);
        // Updating list height, depending on how many separators and headers there are.
        const height = this.hasSeparator ? (totalActionEntries.length - 1) * codeActionLineHeight + 10 : totalActionEntries.length * codeActionLineHeight;
        const heightWithHeaders = height + numHeaders * headerLineHeight - numHeaders * codeActionLineHeight;
        renderMenu.style.height = String(heightWithHeaders) + 'px';
        this.codeActionList.value.layout(heightWithHeaders);
        // For finding width dynamically (not using resize observer)
        const arr = [];
        this.options.forEach((item, index) => {
            var _a, _b;
            if (!this.codeActionList.value) {
                return;
            }
            const element = (_b = document.getElementById((_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.getElementID(index))) === null || _b === void 0 ? void 0 : _b.getElementsByTagName('span')[0].offsetWidth;
            arr.push(Number(element));
        });
        // resize observer - can be used in the future since list widget supports dynamic height but not width
        let maxWidth = Math.max(...arr);
        // If there are no actions, the minimum width is the width of the list widget's action bar.
        if (params.trigger.triggerAction === CodeActionTriggerSource.Refactor && maxWidth < 230) {
            maxWidth = 230;
        }
        // 52 is the additional padding for the list widget (26 left, 26 right)
        renderMenu.style.width = maxWidth + 52 + 5 + 'px';
        (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.layout(heightWithHeaders, maxWidth);
        // List selection
        if (this.viewItems.length < 1 || this.viewItems.every(item => item.isDocumentation)) {
            this.currSelectedItem = undefined;
        }
        else {
            this.focusedEnabledItem = 0;
            this.currSelectedItem = this.viewItems[0].index;
            this.codeActionList.value.setFocus([this.currSelectedItem]);
        }
        // List Focus
        this.codeActionList.value.domFocus();
        const focusTracker = dom.trackFocus(element);
        const blurListener = focusTracker.onDidBlur(() => {
            this.hideCodeActionWidget();
        });
        renderDisposables.add(blurListener);
        renderDisposables.add(focusTracker);
        this._ctxMenuWidgetVisible.set(true);
        return renderDisposables;
    }
    /**
     * Focuses on the previous item in the list using the list widget.
     */
    focusPrevious() {
        var _a;
        if (typeof this.focusedEnabledItem === 'undefined') {
            this.focusedEnabledItem = this.viewItems[0].index;
        }
        else if (this.viewItems.length < 1) {
            return false;
        }
        const startIndex = this.focusedEnabledItem;
        let item;
        do {
            this.focusedEnabledItem = this.focusedEnabledItem - 1;
            if (this.focusedEnabledItem < 0) {
                this.focusedEnabledItem = this.viewItems.length - 1;
            }
            item = this.viewItems[this.focusedEnabledItem];
            (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.setFocus([item.index]);
            this.currSelectedItem = item.index;
        } while (this.focusedEnabledItem !== startIndex && ((!item.isEnabled) || item.action.id === Separator.ID));
        return true;
    }
    /**
     * Focuses on the next item in the list using the list widget.
     */
    focusNext() {
        var _a;
        if (typeof this.focusedEnabledItem === 'undefined') {
            this.focusedEnabledItem = this.viewItems.length - 1;
        }
        else if (this.viewItems.length < 1) {
            return false;
        }
        const startIndex = this.focusedEnabledItem;
        let item;
        do {
            this.focusedEnabledItem = (this.focusedEnabledItem + 1) % this.viewItems.length;
            item = this.viewItems[this.focusedEnabledItem];
            (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.setFocus([item.index]);
            this.currSelectedItem = item.index;
        } while (this.focusedEnabledItem !== startIndex && ((!item.isEnabled) || item.action.id === Separator.ID));
        return true;
    }
    navigateListWithKeysUp() {
        this.focusPrevious();
    }
    navigateListWithKeysDown() {
        this.focusNext();
    }
    onEnterSet() {
        var _a;
        if (typeof this.currSelectedItem === 'number') {
            (_a = this.codeActionList.value) === null || _a === void 0 ? void 0 : _a.setSelection([this.currSelectedItem]);
        }
    }
    dispose() {
        super.dispose();
    }
    hideCodeActionWidget() {
        this._ctxMenuWidgetVisible.reset();
        this.options = [];
        this.viewItems = [];
        this.focusedEnabledItem = 0;
        this.currSelectedItem = undefined;
        this.hasSeparator = false;
        this._contextViewService.hideContextView();
    }
    codeActionTelemetry(openedFromString, didCancel, CodeActions) {
        this._telemetryService.publicLog2('codeAction.applyCodeAction', {
            codeActionFrom: openedFromString,
            validCodeActions: CodeActions.validActions.length,
            cancelled: didCancel,
        });
    }
    /**
     * Helper function to create a context view item using code action `params`.
     */
    showContextViewHelper(params, menuActions) {
        this._contextViewService.showContextView({
            getAnchor: () => params.anchor,
            render: (container) => this.renderCodeActionMenuList(container, menuActions, params),
            onHide: (didCancel) => {
                const openedFromString = (params.options.fromLightbulb) ? CodeActionTriggerSource.Lightbulb : params.trigger.triggerAction;
                this.codeActionTelemetry(openedFromString, didCancel, params.codeActions);
                this._visible = false;
                this._editor.focus();
            },
        }, this._editor.getDomNode(), false);
    }
    /**
     * Toggles whether the disabled actions in the code action widget are visible or not.
     */
    static toggleDisabledOptions(params) {
        params.menuObj.hideCodeActionWidget();
        showDisabled = !showDisabled;
        const actionsToShow = showDisabled ? params.codeActions.allActions : params.codeActions.validActions;
        const menuActions = params.menuObj.getMenuActions(params.trigger, actionsToShow, params.codeActions.documentation);
        params.menuObj.showContextViewHelper(params, menuActions);
    }
    show(trigger, codeActions, at, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = this._editor.getModel();
            if (!model) {
                return;
            }
            let actionsToShow = options.includeDisabledActions ? codeActions.allActions : codeActions.validActions;
            // If there are no refactorings, we should still show the menu and only displayed disabled actions without `enable` button.
            if (trigger.triggerAction === CodeActionTriggerSource.Refactor && codeActions.validActions.length > 0) {
                actionsToShow = showDisabled ? codeActions.allActions : codeActions.validActions;
            }
            if (!actionsToShow.length) {
                this._visible = false;
                return;
            }
            if (!this._editor.getDomNode()) {
                // cancel when editor went off-dom
                this._visible = false;
                throw canceled();
            }
            this._visible = true;
            this._showingActions.value = codeActions;
            const menuActions = this.getMenuActions(trigger, actionsToShow, codeActions.documentation);
            const anchor = Position.isIPosition(at) ? this._toCoords(at) : at || { x: 0, y: 0 };
            const params = { options, trigger, codeActions, anchor, menuActions, showDisabled: true, visible: this._visible, menuObj: this };
            const resolver = this._keybindingResolver.getResolver();
            const useShadowDOM = this._editor.getOption(117 /* EditorOption.useShadowDOM */);
            if (this.isCodeActionWidgetEnabled(model)) {
                this.showContextViewHelper(params, menuActions);
            }
            else {
                this._contextMenuService.showContextMenu({
                    domForShadowRoot: useShadowDOM ? this._editor.getDomNode() : undefined,
                    getAnchor: () => anchor,
                    getActions: () => menuActions,
                    onHide: (didCancel) => {
                        const openedFromString = (options.fromLightbulb) ? CodeActionTriggerSource.Lightbulb : trigger.triggerAction;
                        this.codeActionTelemetry(openedFromString, didCancel, codeActions);
                        this._visible = false;
                        this._editor.focus();
                    },
                    autoSelectFirstItem: true,
                    getKeyBinding: action => action instanceof CodeActionAction ? resolver(action.action) : undefined,
                });
            }
        });
    }
    getMenuActions(trigger, actionsToShow, documentation) {
        var _a, _b;
        const toCodeActionAction = (item) => new CodeActionAction(item.action, () => this._delegate.onSelectCodeAction(item, trigger));
        const result = actionsToShow
            .map(toCodeActionAction);
        const allDocumentation = [...documentation];
        const model = this._editor.getModel();
        if (model && result.length) {
            for (const provider of this._languageFeaturesService.codeActionProvider.all(model)) {
                if (provider._getAdditionalMenuItems) {
                    allDocumentation.push(...provider._getAdditionalMenuItems({ trigger: trigger.type, only: (_b = (_a = trigger.filter) === null || _a === void 0 ? void 0 : _a.include) === null || _b === void 0 ? void 0 : _b.value }, actionsToShow.map(item => item.action)));
                }
            }
        }
        if (allDocumentation.length) {
            result.push(new Separator(), ...allDocumentation.map(command => toCodeActionAction(new CodeActionItem({
                title: command.title,
                command: command,
                kind: CodeActionMenu.documentationID
            }, undefined))));
        }
        return result;
    }
    _toCoords(position) {
        if (!this._editor.hasModel()) {
            return { x: 0, y: 0 };
        }
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
        this._editor.render();
        // Translate to absolute editor position
        const cursorCoords = this._editor.getScrolledVisiblePosition(position);
        const editorCoords = dom.getDomNodePagePosition(this._editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        return { x, y };
    }
};
CodeActionMenu.documentationID = '_documentation';
CodeActionMenu = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ILanguageFeaturesService),
    __param(5, ITelemetryService),
    __param(6, IThemeService),
    __param(7, IConfigurationService),
    __param(8, IContextViewService),
    __param(9, IContextKeyService)
], CodeActionMenu);
export { CodeActionMenu };
export class CodeActionKeybindingResolver {
    constructor(_keybindingProvider) {
        this._keybindingProvider = _keybindingProvider;
    }
    getResolver() {
        // Lazy since we may not actually ever read the value
        const allCodeActionBindings = new Lazy(() => this._keybindingProvider.getKeybindings()
            .filter(item => CodeActionKeybindingResolver.codeActionCommands.indexOf(item.command) >= 0)
            .filter(item => item.resolvedKeybinding)
            .map((item) => {
            // Special case these commands since they come built-in with VS Code and don't use 'commandArgs'
            let commandArgs = item.commandArgs;
            if (item.command === organizeImportsCommandId) {
                commandArgs = { kind: CodeActionKind.SourceOrganizeImports.value };
            }
            else if (item.command === fixAllCommandId) {
                commandArgs = { kind: CodeActionKind.SourceFixAll.value };
            }
            return Object.assign({ resolvedKeybinding: item.resolvedKeybinding }, CodeActionCommandArgs.fromUser(commandArgs, {
                kind: CodeActionKind.None,
                apply: "never" /* CodeActionAutoApply.Never */
            }));
        }));
        return (action) => {
            if (action.kind) {
                const binding = this.bestKeybindingForCodeAction(action, allCodeActionBindings.getValue());
                return binding === null || binding === void 0 ? void 0 : binding.resolvedKeybinding;
            }
            return undefined;
        };
    }
    bestKeybindingForCodeAction(action, candidates) {
        if (!action.kind) {
            return undefined;
        }
        const kind = new CodeActionKind(action.kind);
        return candidates
            .filter(candidate => candidate.kind.contains(kind))
            .filter(candidate => {
            if (candidate.preferred) {
                // If the candidate keybinding only applies to preferred actions, the this action must also be preferred
                return action.isPreferred;
            }
            return true;
        })
            .reduceRight((currentBest, candidate) => {
            if (!currentBest) {
                return candidate;
            }
            // Select the more specific binding
            return currentBest.kind.contains(candidate.kind) ? candidate : currentBest;
        }, undefined);
    }
}
CodeActionKeybindingResolver.codeActionCommands = [
    refactorCommandId,
    codeActionCommandId,
    sourceActionCommandId,
    organizeImportsCommandId,
    fixAllCommandId
];
