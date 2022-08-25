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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { OutlineModel, OutlineElement, OutlineGroup } from '../../documentSymbols/browser/outlineModel.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { binarySearch } from '../../../../base/common/arrays.js';
export class StickyRange {
    constructor(startLineNumber, endLineNumber) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
}
export class StickyLineCandidate {
    constructor(startLineNumber, endLineNumber, nestingDepth) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.nestingDepth = nestingDepth;
    }
}
let StickyLineCandidateProvider = class StickyLineCandidateProvider extends Disposable {
    constructor(editor, languageFeaturesService) {
        super();
        this.onStickyScrollChangeEmitter = this._register(new Emitter());
        this.onStickyScrollChange = this.onStickyScrollChangeEmitter.event;
        this._sessionStore = new DisposableStore();
        this._modelVersionId = 0;
        this._editor = editor;
        this._languageFeaturesService = languageFeaturesService;
        this._updateSoon = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._register(this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(105 /* EditorOption.stickyScroll */)) {
                this.readConfiguration();
            }
        }));
        this.readConfiguration();
    }
    readConfiguration() {
        const options = this._editor.getOption(105 /* EditorOption.stickyScroll */);
        if (options.enabled === false) {
            this._sessionStore.clear();
            return;
        }
        else {
            this._sessionStore.add(this._editor.onDidChangeModel(() => this.update()));
            this._sessionStore.add(this._editor.onDidChangeHiddenAreas(() => this.update()));
            this._sessionStore.add(this._editor.onDidChangeModelContent(() => this._updateSoon.schedule()));
            this._sessionStore.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => this.update()));
            this.update();
        }
    }
    getVersionId() {
        return this._modelVersionId;
    }
    update() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            (_a = this._cts) === null || _a === void 0 ? void 0 : _a.dispose(true);
            this._cts = new CancellationTokenSource();
            yield this.updateOutlineModel(this._cts.token);
            this.onStickyScrollChangeEmitter.fire();
        });
    }
    updateOutlineModel(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._editor.hasModel()) {
                const model = this._editor.getModel();
                const modelVersionId = model.getVersionId();
                const outlineModel = yield OutlineModel.create(this._languageFeaturesService.documentSymbolProvider, model, token);
                if (token.isCancellationRequested) {
                    return;
                }
                this._outlineModel = StickyOutlineElement.fromOutlineModel(outlineModel);
                this._modelVersionId = modelVersionId;
            }
        });
    }
    updateIndex(index) {
        if (index === -1) {
            index = 0;
        }
        else if (index < 0) {
            index = -index - 2;
        }
        return index;
    }
    getCandidateStickyLinesIntersectingFromOutline(range, outlineModel, result, depth, lastStartLineNumber) {
        if (outlineModel.children.length === 0) {
            return;
        }
        let lastLine = lastStartLineNumber;
        const childrenStartLines = [];
        for (let i = 0; i < outlineModel.children.length; i++) {
            const child = outlineModel.children[i];
            if (child.range) {
                childrenStartLines.push(child.range.startLineNumber);
            }
        }
        const lowerBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber, (a, b) => { return a - b; }));
        const upperBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber + depth, (a, b) => { return a - b; }));
        for (let i = lowerBound; i <= upperBound; i++) {
            const child = outlineModel.children[i];
            if (!child) {
                return;
            }
            if (child.range) {
                const childStartLine = child.range.startLineNumber;
                const childEndLine = child.range.endLineNumber;
                if (range.startLineNumber <= childEndLine + 1 && childStartLine - 1 <= range.endLineNumber && childStartLine !== lastLine) {
                    lastLine = childStartLine;
                    result.push(new StickyLineCandidate(childStartLine, childEndLine - 1, depth + 1));
                    this.getCandidateStickyLinesIntersectingFromOutline(range, child, result, depth + 1, childStartLine);
                }
            }
            else {
                this.getCandidateStickyLinesIntersectingFromOutline(range, child, result, depth, lastStartLineNumber);
            }
        }
    }
    getCandidateStickyLinesIntersecting(range) {
        var _a;
        let stickyLineCandidates = [];
        this.getCandidateStickyLinesIntersectingFromOutline(range, this._outlineModel, stickyLineCandidates, 0, -1);
        const hiddenRanges = (_a = this._editor._getViewModel()) === null || _a === void 0 ? void 0 : _a.getHiddenAreas();
        if (hiddenRanges) {
            for (const hiddenRange of hiddenRanges) {
                stickyLineCandidates = stickyLineCandidates.filter(stickyLine => !(stickyLine.startLineNumber >= hiddenRange.startLineNumber && stickyLine.endLineNumber <= hiddenRange.endLineNumber + 1));
            }
        }
        return stickyLineCandidates;
    }
    dispose() {
        super.dispose();
        this._sessionStore.dispose();
    }
};
StickyLineCandidateProvider = __decorate([
    __param(1, ILanguageFeaturesService)
], StickyLineCandidateProvider);
export { StickyLineCandidateProvider };
class StickyOutlineElement {
    constructor(
    /**
     * Range of line numbers spanned by the current scope
     */
    range, 
    /**
     * Must be sorted by start line number
    */
    children) {
        this.range = range;
        this.children = children;
    }
    static fromOutlineModel(outlineModel) {
        const children = [];
        for (const child of outlineModel.children.values()) {
            if (child instanceof OutlineElement && child.symbol.selectionRange.startLineNumber !== child.symbol.range.endLineNumber || child instanceof OutlineGroup || child instanceof OutlineModel) {
                children.push(StickyOutlineElement.fromOutlineModel(child));
            }
        }
        children.sort((child1, child2) => {
            if (!child1.range || !child2.range) {
                return 1;
            }
            else if (child1.range.startLineNumber !== child2.range.startLineNumber) {
                return child1.range.startLineNumber - child2.range.startLineNumber;
            }
            else {
                return child2.range.endLineNumber - child1.range.endLineNumber;
            }
        });
        let range;
        if (outlineModel instanceof OutlineElement) {
            range = new StickyRange(outlineModel.symbol.selectionRange.startLineNumber, outlineModel.symbol.range.endLineNumber);
        }
        else {
            range = undefined;
        }
        return new StickyOutlineElement(range, children);
    }
}
