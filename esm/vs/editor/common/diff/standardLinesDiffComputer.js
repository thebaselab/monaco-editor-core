/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { SequenceFromIntArray } from './algorithms/diffAlgorithm.js';
import { DynamicProgrammingDiffing } from './algorithms/dynamicProgrammingDiffing.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { LineRange, LineRangeMapping, RangeMapping } from './linesDiffComputer.js';
export class StandardLinesDiffComputer {
    constructor() {
        this.dynamicProgrammingDiffing = new DynamicProgrammingDiffing();
        this.myersDiffingAlgorithm = new MyersDiffAlgorithm();
    }
    computeDiff(originalLines, modifiedLines, options) {
        const perfectHashes = new Map();
        function getOrCreateHash(text) {
            let hash = perfectHashes.get(text);
            if (hash === undefined) {
                hash = perfectHashes.size;
                perfectHashes.set(text, hash);
            }
            return hash;
        }
        const srcDocLines = originalLines.map((l) => getOrCreateHash(l.trim()));
        const tgtDocLines = modifiedLines.map((l) => getOrCreateHash(l.trim()));
        const sequence1 = new SequenceFromIntArray(srcDocLines);
        const sequence2 = new SequenceFromIntArray(tgtDocLines);
        const lineAlignments = (() => {
            if (sequence1.length + sequence2.length < 1500) {
                // Use the improved algorithm for small files
                return this.dynamicProgrammingDiffing.compute(sequence1, sequence2, (offset1, offset2) => originalLines[offset1] === modifiedLines[offset2]
                    ? modifiedLines[offset2].length === 0
                        ? 0.1
                        : 1 + Math.log(1 + modifiedLines[offset2].length)
                    : 0.99);
            }
            return this.myersDiffingAlgorithm.compute(sequence1, sequence2);
        })();
        const alignments = [];
        for (const diff of lineAlignments) {
            const characterDiffs = this.refineDiff(originalLines, modifiedLines, diff);
            for (const a of characterDiffs) {
                alignments.push(a);
            }
        }
        const changes = lineRangeMappingFromRangeMappings(alignments);
        return {
            quitEarly: false,
            changes: changes,
        };
    }
    refineDiff(originalLines, modifiedLines, diff) {
        const sourceSlice = new Slice(originalLines, diff.seq1Range);
        const targetSlice = new Slice(modifiedLines, diff.seq2Range);
        const diffs = this.myersDiffingAlgorithm.compute(sourceSlice, targetSlice);
        const result = diffs.map((d) => new RangeMapping(sourceSlice.translateRange(d.seq1Range).delta(diff.seq1Range.start), targetSlice.translateRange(d.seq2Range).delta(diff.seq2Range.start)));
        return result;
    }
}
export function lineRangeMappingFromRangeMappings(alignments) {
    const changes = [];
    for (const g of group(alignments, (a1, a2) => a2.modifiedRange.startLineNumber - (a1.modifiedRange.endLineNumber - (a1.modifiedRange.endColumn > 1 ? 0 : 1)) <= 1)) {
        const first = g[0];
        const last = g[g.length - 1];
        changes.push(new LineRangeMapping(new LineRange(first.originalRange.startLineNumber, last.originalRange.endLineNumber + (last.originalRange.endColumn > 1 || last.modifiedRange.endColumn > 1 ? 1 : 0)), new LineRange(first.modifiedRange.startLineNumber, last.modifiedRange.endLineNumber + (last.originalRange.endColumn > 1 || last.modifiedRange.endColumn > 1 ? 1 : 0)), g));
    }
    return changes;
}
function* group(items, shouldBeGrouped) {
    let currentGroup;
    let last;
    for (const item of items) {
        if (last !== undefined && shouldBeGrouped(last, item)) {
            currentGroup.push(item);
        }
        else {
            if (currentGroup) {
                yield currentGroup;
            }
            currentGroup = [item];
        }
        last = item;
    }
    if (currentGroup) {
        yield currentGroup;
    }
}
class Slice {
    constructor(lines, lineRange) {
        this.lines = lines;
        this.lineRange = lineRange;
        let chars = 0;
        this.firstCharOnLineOffsets = new Int32Array(lineRange.length);
        for (let i = lineRange.start; i < lineRange.endExclusive; i++) {
            const line = lines[i];
            chars += line.length;
            this.firstCharOnLineOffsets[i - lineRange.start] = chars + 1;
            chars++;
        }
        this.elements = new Int32Array(chars);
        let offset = 0;
        for (let i = lineRange.start; i < lineRange.endExclusive; i++) {
            const line = lines[i];
            for (let i = 0; i < line.length; i++) {
                this.elements[offset + i] = line.charCodeAt(i);
            }
            offset += line.length;
            if (i < lines.length - 1) {
                this.elements[offset] = '\n'.charCodeAt(0);
                offset += 1;
            }
        }
    }
    getElement(offset) {
        return this.elements[offset];
    }
    get length() {
        return this.elements.length;
    }
    translateOffset(offset) {
        // find smallest i, so that lineBreakOffsets[i] > offset using binary search
        let i = 0;
        let j = this.firstCharOnLineOffsets.length;
        while (i < j) {
            const k = Math.floor((i + j) / 2);
            if (this.firstCharOnLineOffsets[k] > offset) {
                j = k;
            }
            else {
                i = k + 1;
            }
        }
        const offsetOfPrevLineBreak = i === 0 ? 0 : this.firstCharOnLineOffsets[i - 1];
        return new Position(i + 1, offset - offsetOfPrevLineBreak + 1);
    }
    translateRange(range) {
        return Range.fromPositions(this.translateOffset(range.start), this.translateOffset(range.endExclusive));
    }
}
