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
import '../../../../base/browser/ui/codicons/codiconStyles'; // The codicon symbol styles are defined here and must be loaded
import '../../../contrib/symbolIcons/symbolIcons'; // The codicon symbol colors are defined here and must be loaded to get colors
import { AbstractGotoSymbolQuickAccessProvider } from '../../../contrib/quickAccess/gotoSymbolQuickAccess';
import { Registry } from '../../../../platform/registry/common/platform';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess';
import { ICodeEditorService } from '../../../browser/services/codeEditorService';
import { withNullAsUndefined } from '../../../../base/common/types';
import { QuickOutlineNLS } from '../../../common/standaloneStrings';
import { Event } from '../../../../base/common/event';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions';
import { EditorContextKeys } from '../../../common/editorContextKeys';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput';
import { IOutlineModelService } from '../../../contrib/documentSymbols/outlineModel';
let StandaloneGotoSymbolQuickAccessProvider = class StandaloneGotoSymbolQuickAccessProvider extends AbstractGotoSymbolQuickAccessProvider {
    constructor(editorService, outlineModelService) {
        super(outlineModelService);
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return withNullAsUndefined(this.editorService.getFocusedCodeEditor());
    }
};
StandaloneGotoSymbolQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IOutlineModelService)
], StandaloneGotoSymbolQuickAccessProvider);
export { StandaloneGotoSymbolQuickAccessProvider };
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoSymbolQuickAccessProvider,
    prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
    helpEntries: [
        { description: QuickOutlineNLS.quickOutlineActionLabel, prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX, needsEditor: true },
        { description: QuickOutlineNLS.quickOutlineByCategoryActionLabel, prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY, needsEditor: true }
    ]
});
export class GotoLineAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.quickOutline',
            label: QuickOutlineNLS.quickOutlineActionLabel,
            alias: 'Go to Symbol...',
            precondition: EditorContextKeys.hasDocumentSymbolProvider,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 45 /* KeyO */,
                weight: 100 /* EditorContrib */
            },
            contextMenuOpts: {
                group: 'navigation',
                order: 3
            }
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(AbstractGotoSymbolQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
