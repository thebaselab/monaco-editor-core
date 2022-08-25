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
import { LineRange, LineRangeMapping, RangeMapping } from '../../common/diff/linesDiffComputer.js';
import { Range } from '../../common/core/range.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
let WorkerBasedDocumentDiffProvider = class WorkerBasedDocumentDiffProvider {
    constructor(editorWorkerService) {
        this.editorWorkerService = editorWorkerService;
    }
    computeDiff(original, modified, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.editorWorkerService.computeDiff(original.uri, modified.uri, options);
            if (!result) {
                throw new Error('no diff result available');
            }
            // Convert from space efficient JSON data to rich objects.
            const diff = {
                identical: result.identical,
                quitEarly: result.quitEarly,
                changes: result.changes.map((c) => {
                    var _a;
                    return new LineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), (_a = c[4]) === null || _a === void 0 ? void 0 : _a.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7]))));
                }),
            };
            return diff;
        });
    }
};
WorkerBasedDocumentDiffProvider = __decorate([
    __param(0, IEditorWorkerService)
], WorkerBasedDocumentDiffProvider);
export { WorkerBasedDocumentDiffProvider };
