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
import { AbstractGotoLineQuickAccessProvider } from '../../../contrib/quickAccess/gotoLineQuickAccess';
import { Registry } from '../../../../platform/registry/common/platform';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess';
import { ICodeEditorService } from '../../../browser/services/codeEditorService';
import { withNullAsUndefined } from '../../../../base/common/types';
import { GoToLineNLS } from '../../../common/standaloneStrings';
import { Event } from '../../../../base/common/event';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions';
import { EditorContextKeys } from '../../../common/editorContextKeys';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput';
let StandaloneGotoLineQuickAccessProvider = class StandaloneGotoLineQuickAccessProvider extends AbstractGotoLineQuickAccessProvider {
    constructor(editorService) {
        super();
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return withNullAsUndefined(this.editorService.getFocusedCodeEditor());
    }
};
StandaloneGotoLineQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService)
], StandaloneGotoLineQuickAccessProvider);
export { StandaloneGotoLineQuickAccessProvider };
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoLineQuickAccessProvider,
    prefix: StandaloneGotoLineQuickAccessProvider.PREFIX,
    helpEntries: [{ description: GoToLineNLS.gotoLineActionLabel, needsEditor: true }]
});
export class GotoLineAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.gotoLine',
            label: GoToLineNLS.gotoLineActionLabel,
            alias: 'Go to Line/Column...',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* CtrlCmd */ | 37 /* KeyG */,
                mac: { primary: 256 /* WinCtrl */ | 37 /* KeyG */ },
                weight: 100 /* EditorContrib */
            }
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(StandaloneGotoLineQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
