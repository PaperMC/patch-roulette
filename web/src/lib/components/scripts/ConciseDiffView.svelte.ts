import { diffArrays, parsePatch } from "diff";
import { type Component } from "svelte";
import NoEntry16 from "virtual:icons/octicon/no-entry-16";
import { codeToTokens, type BundledLanguage, type BundledTheme, type CodeToTokensOptions, type GrammarState } from "shiki";
import { guessLanguageFromExtension } from "$lib/util";

export type LineSegment = {
    text?: string | null;
    icon?: Component | null;
    caption?: string | null;
    classes?: string;
    style?: string;
};

export enum PatchLineType {
    HEADER,
    CONTEXT,
    ADD,
    REMOVE,
    SPACER,
}

export type PatchLineTypeProps = {
    classes: string;
    prefix?: string;
};

export const patchLineTypeProps: Record<PatchLineType, PatchLineTypeProps> = {
    [PatchLineType.HEADER]: {
        classes: "bg-gray-200",
    },
    [PatchLineType.ADD]: {
        classes: "bg-green-200",
        prefix: "+",
    },
    [PatchLineType.REMOVE]: {
        classes: "bg-red-200",
        prefix: "-",
    },
    [PatchLineType.CONTEXT]: {
        classes: "",
        prefix: " ",
    },
    [PatchLineType.SPACER]: {
        classes: "h-2",
    },
};

export enum InnerPatchLineType {
    ADD,
    REMOVE,
    NONE,
}

export type InnerPatchLineTypeProps = {
    classes: string;
};

export const innerPatchLineTypeProps: Record<InnerPatchLineType, InnerPatchLineTypeProps> = {
    [InnerPatchLineType.ADD]: {
        classes: "bg-green-300 text-green-800",
    },
    [InnerPatchLineType.REMOVE]: {
        classes: "bg-red-300 text-red-800",
    },
    [InnerPatchLineType.NONE]: {
        classes: "",
    },
};

export type PatchLine = {
    type: PatchLineType;
    content: LineSegment[];
    innerPatchLineType: InnerPatchLineType;
};

const noTrailingNewlineMarker: string = "%%" + ["PATCH", "ROULETTE", "NO", "TRAILING", "NEWLINE", "MARKER"].join("%") + "%%";

enum LineProcessorState {
    CONTEXT,
    ADD,
    REMOVE,
}

class LineProcessor {
    private contentLines: string[] = [];
    private output: PatchLine[] = [];
    private state: LineProcessorState = LineProcessorState.CONTEXT;
    private addLinesText: string[] = [];
    private removeLinesText: string[] = [];
    private contextLinesText: string[] = [];
    private fromFile: string | undefined;
    private toFile: string | undefined;
    private patchFile: boolean = false;
    private lastShikiStateAdd: GrammarState | null = null;
    private lastShikiStateRemove: GrammarState | null = null;
    private lastShikiStateContext: GrammarState | null = null;

    async process(fromFile: string | undefined, toFile: string | undefined, contentLines: string[], output: PatchLine[]) {
        this.initialize(fromFile, toFile, contentLines, output);
        await this.processInternal();
    }

    private initialize(fromFile: string | undefined, toFile: string | undefined, contentLines: string[], output: PatchLine[]) {
        this.contentLines = contentLines;
        this.output = output;
        this.state = LineProcessorState.CONTEXT;
        this.addLinesText = [];
        this.removeLinesText = [];
        this.contextLinesText = [];
        this.fromFile = fromFile;
        this.toFile = toFile;
        this.patchFile = this.isPatchFile(fromFile) || this.isPatchFile(toFile);
        this.lastShikiStateAdd = null;
        this.lastShikiStateRemove = null;
        this.lastShikiStateContext = null;
    }

    private eitherFileName(): string | undefined {
        return this.fromFile || this.toFile;
    }

    private isPatchFile(path: string | undefined): boolean {
        if (path === undefined) {
            return false;
        }
        return path.endsWith(".patch") || path.endsWith(".diff");
    }

    private async processInternal() {
        for (let i = 0; i < this.contentLines.length; i++) {
            const lineText = this.contentLines[i];

            const oldState = this.state;
            if (lineText.startsWith("+")) {
                this.state = LineProcessorState.ADD;
            } else if (lineText.startsWith("-")) {
                this.state = LineProcessorState.REMOVE;
            } else {
                if (lineText === "\\ No newline at end of file") {
                    // This is metadata for the previous line
                    switch (this.state) {
                        case LineProcessorState.ADD:
                            this.addLinesText[this.addLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                        case LineProcessorState.REMOVE:
                            this.removeLinesText[this.removeLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                        case LineProcessorState.CONTEXT:
                            this.contextLinesText[this.contextLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                    }
                    continue;
                } else {
                    this.state = LineProcessorState.CONTEXT;
                }
            }

            const stateChanged = oldState !== this.state;

            if (stateChanged && this.state === LineProcessorState.CONTEXT) {
                /*
                 * Transition to CONTEXT
                 */
                if (this.addLinesText.length == this.removeLinesText.length) {
                    await this.processLineDiff();
                } else {
                    // The added and removed lines are not adjacent or are not symmetric
                    await this.appendRemainingPlain();
                }
            } else if (stateChanged && oldState === LineProcessorState.CONTEXT) {
                /*
                 * Transition from CONTEXT
                 */
                await this.appendRemainingPlain();
            }

            if (this.state === LineProcessorState.ADD) {
                this.addLinesText.push(lineText.substring(1));
            } else if (this.state === LineProcessorState.REMOVE) {
                this.removeLinesText.push(lineText.substring(1));
            } else {
                this.contextLinesText.push(lineText.substring(1));
            }
        }

        if (this.state === LineProcessorState.CONTEXT) {
            await this.appendRemainingPlain();
        } else if (this.addLinesText.length == this.removeLinesText.length) {
            await this.processLineDiff();
        } else {
            // The added and removed lines are not adjacent or are not symmetric
            await this.appendRemainingPlain();
        }

        this.postprocess();
    }

    private async codeToTokens(text: string, state: LineProcessorState) {
        const opts: CodeToTokensOptions<BundledLanguage, BundledTheme> = {
            lang: guessLanguageFromExtension(this.eitherFileName()!),
            theme: "github-light",
        };

        // Use state from the previous line, using context to fill the gaps
        // for adds/removes and adds to fill the gaps for context
        switch (state) {
            case LineProcessorState.ADD:
                opts.grammarState = this.lastShikiStateAdd || this.lastShikiStateContext || undefined;
                break;
            case LineProcessorState.REMOVE:
                opts.grammarState = this.lastShikiStateRemove || this.lastShikiStateContext || undefined;
                break;
            case LineProcessorState.CONTEXT:
                opts.grammarState = this.lastShikiStateContext || this.lastShikiStateAdd || undefined;
                break;
        }

        const result = await codeToTokens(text, opts);

        switch (state) {
            case LineProcessorState.ADD:
                this.lastShikiStateAdd = result.grammarState || null;
                break;
            case LineProcessorState.REMOVE:
                this.lastShikiStateRemove = result.grammarState || null;
                break;
            case LineProcessorState.CONTEXT:
                this.lastShikiStateContext = result.grammarState || null;
                this.lastShikiStateAdd = null;
                this.lastShikiStateRemove = null;
                break;
        }

        return result;
    }

    private async appendRemainingPlain() {
        for (let i = 0; i < this.removeLinesText.length; i++) {
            const text = this.removeLinesText[i];
            const tokensResult = await this.codeToTokens(text, LineProcessorState.REMOVE);
            const content = tokensResult.tokens[0].map((token) => {
                return { text: token.content, style: `color: ${token.color};` };
            });
            this.output.push({
                content,
                type: PatchLineType.REMOVE,
                innerPatchLineType: this.getInnerType(text),
            });
        }
        for (let i = 0; i < this.addLinesText.length; i++) {
            const text = this.addLinesText[i];
            const tokensResult = await this.codeToTokens(text, LineProcessorState.ADD);
            const content = tokensResult.tokens[0].map((token) => {
                return { text: token.content, style: `color: ${token.color};` };
            });
            this.output.push({
                content,
                type: PatchLineType.ADD,
                innerPatchLineType: this.getInnerType(text),
            });
        }
        for (let i = 0; i < this.contextLinesText.length; i++) {
            const text = this.contextLinesText[i];
            const tokensResult = await this.codeToTokens(text, LineProcessorState.CONTEXT);
            const content = tokensResult.tokens[0].map((token) => {
                return { text: token.content, style: `color: ${token.color};` };
            });
            this.output.push({
                content,
                type: PatchLineType.CONTEXT,
                innerPatchLineType: this.getInnerType(text),
            });
        }
        this.removeLinesText = [];
        this.addLinesText = [];
        this.contextLinesText = [];
    }

    private async processLineDiff() {
        const addLines: LineSegment[][] = [];
        const removeLines: LineSegment[][] = [];

        for (let j = 0; j < this.addLinesText.length; j++) {
            const removeShikiResult = await this.codeToTokens(this.removeLinesText[j], LineProcessorState.REMOVE);
            const removeShikiTokens = removeShikiResult.tokens[0];
            const removeStringTokens = removeShikiTokens.map((token) => token.content);

            const addShikiResult = await this.codeToTokens(this.addLinesText[j], LineProcessorState.ADD);
            const addShikiTokens = addShikiResult.tokens[0];
            const addStringTokens = addShikiTokens.map((token) => token.content);

            const diffResult = diffArrays(removeStringTokens, addStringTokens, {
                oneChangePerToken: true,
            });

            const addLine: LineSegment[] = [];
            const removeLine: LineSegment[] = [];
            let contextCount = 0;
            let addCount = 0;
            let removeCount = 0;
            for (let i = 0; i < diffResult.length; i++) {
                const change = diffResult[i];
                for (const text of change.value) {
                    if (change.added) {
                        const token = addShikiTokens[addCount + contextCount];
                        addLine.push({ text: text, classes: `rounded-sm bg-green-100 my-0.5`, style: `color: ${token.color};` });
                        addCount += 1;
                    } else if (change.removed) {
                        const token = removeShikiTokens[removeCount + contextCount];
                        removeLine.push({ text: text, classes: "rounded-sm bg-red-100 my-0.5", style: `color: ${token.color};` });
                        removeCount += 1;
                    } else {
                        const token = addShikiTokens[addCount + contextCount];
                        addLine.push({ text: text, style: `color: ${token.color};` });
                        removeLine.push({ text: text, style: `color: ${token.color};` });
                        contextCount += 1;
                    }
                }
            }
            if (addLine.length !== 0) {
                addLines.push(addLine);
            }
            if (removeLine.length !== 0) {
                removeLines.push(removeLine);
            }
        }
        removeLines.forEach((line) => {
            this.output.push({
                content: line,
                type: PatchLineType.REMOVE,
                innerPatchLineType: this.getInnerType(line[0].text!),
            });
        });
        addLines.forEach((line) => {
            this.output.push({
                content: line,
                type: PatchLineType.ADD,
                innerPatchLineType: this.getInnerType(line[0].text!),
            });
        });

        this.addLinesText = [];
        this.removeLinesText = [];
    }

    private postprocess() {
        for (const line of this.output) {
            if (line.content.length === 0) {
                continue;
            }
            const lastSegment = line.content[line.content.length - 1];
            if (!lastSegment.text) {
                continue;
            }
            if (lastSegment.text.endsWith(noTrailingNewlineMarker)) {
                lastSegment.text = lastSegment.text.substring(0, lastSegment.text.length - noTrailingNewlineMarker.length);
                if (lastSegment.text === "") {
                    line.content.pop();
                }
                line.content.push({
                    icon: NoEntry16,
                    caption: "No trailing newline",
                    classes: lastSegment.classes,
                });
            }
        }
    }

    private getInnerType(text: string) {
        if (this.patchFile) {
            if (text.startsWith("+")) {
                return InnerPatchLineType.ADD;
            } else if (text.startsWith("-")) {
                return InnerPatchLineType.REMOVE;
            }
        }

        return InnerPatchLineType.NONE;
    }
}

const lineProcessors: LineProcessor[] = [];

async function processLines(fromFile: string | undefined, toFile: string | undefined, contentLines: string[], lines: PatchLine[]) {
    const lineProcessor = lineProcessors.pop() ?? new LineProcessor();
    try {
        return await lineProcessor.process(fromFile, toFile, contentLines, lines);
    } finally {
        lineProcessors.push(lineProcessor);
    }
}

export async function makeLines(patchContent: string): Promise<PatchLine[]> {
    const diffs = parsePatch(patchContent);
    if (diffs.length !== 1) {
        throw Error("Only one patch is supported");
    }

    const lines: PatchLine[] = [];

    for (const hunk of diffs[0].hunks) {
        // Skip this hunk if it only contains header changes
        if (!hasNonHeaderChanges(hunk.lines)) {
            continue;
        }

        // Add the hunk header
        const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
        lines.push({
            type: PatchLineType.HEADER,
            content: [{ text: header }],
            innerPatchLineType: InnerPatchLineType.NONE,
        });

        const hunkLines: PatchLine[] = [];
        const oldFileName = diffs[0].oldFileName === "/dev/null" ? undefined : diffs[0].oldFileName;
        const newFileName = diffs[0].newFileName === "/dev/null" ? undefined : diffs[0].newFileName;
        await processLines(oldFileName, newFileName, hunk.lines, hunkLines);
        lines.push(...hunkLines);

        // Add a separator between hunks
        lines.push({ content: [{ text: "" }], type: PatchLineType.SPACER, innerPatchLineType: InnerPatchLineType.NONE });
    }

    return lines;
}

function hasNonHeaderChanges(contentLines: string[]) {
    for (const line of contentLines) {
        if (lineHasNonHeaderChange(line)) {
            return true;
        }
    }
    return false;
}

const indexHeaderRegex = /^index [0-9a-f]+\.\.[0-9a-f]+ \d+$/;

function lineHasNonHeaderChange(line: string) {
    if (!(line.startsWith("+") || line.startsWith("-"))) {
        // context line
        return false;
    }

    // Added or removed content
    const content = line.substring(1);
    // Skip header lines and hunk headers in nested patches
    return !(
        content.startsWith("+++") ||
        content.startsWith("---") ||
        content.startsWith("@@ -") ||
        content.startsWith("@@ +") ||
        content.match(indexHeaderRegex)
    );
}

const delimiters = [
    " ",
    "\t",
    "\n",
    ".",
    ",",
    ":",
    ";",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "'",
    '"',
    "`",
    "|",
    "&",
    "<",
    ">",
    "=",
    "+",
    "-",
    "*",
    "/",
    "%",
    "!",
    "?",
    "#",
    "@",
    "^",
    "~",
    "\\",
    "$",
];

function genericTokenize(content: string): string[] {
    const tokens: string[] = [];
    let currentToken = "";

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (delimiters.includes(char)) {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = "";
            }
            tokens.push(char);
        } else {
            currentToken += char;
        }
    }

    if (currentToken) {
        tokens.push(currentToken);
    }

    return tokens;
}
