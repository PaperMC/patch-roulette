<script lang="ts">
    import { makeLines, innerPatchLineTypeProps, type PatchLine, patchLineTypeProps } from "$lib/components/scripts/ConciseDiffView.svelte.js";
    import { type BundledTheme, bundledThemes } from "shiki";

    interface Props {
        rawPatchContent: string;
        syntaxHighlighting?: boolean;
        syntaxHighlightingTheme?: BundledTheme;
        omitPatchHeaderOnlyHunks?: boolean;
    }

    let { rawPatchContent, syntaxHighlighting = true, syntaxHighlightingTheme, omitPatchHeaderOnlyHunks = true }: Props = $props();

    let patchLines: Promise<PatchLine[]> = $state(new Promise<PatchLine[]>(() => []));
    $effect(() => {
        const promise = makeLines(rawPatchContent, syntaxHighlighting, syntaxHighlightingTheme, omitPatchHeaderOnlyHunks);
        promise.then(
            () => {
                // Don't replace a potentially completed promise with a pending one, wait until the replacement is ready for smooth transitions
                patchLines = promise;
            },
            () => {
                // Propagate errors
                patchLines = promise;
            },
        );
    });

    type BaseColors = { fg: string; bg: string };

    async function getBaseColors(syntaxHighlightingTheme: BundledTheme | undefined, syntaxHighlighting: boolean): Promise<BaseColors> {
        if (!syntaxHighlightingTheme || !syntaxHighlighting) {
            return { fg: "", bg: "" };
        }
        const theme = await bundledThemes[syntaxHighlightingTheme]();
        console.log(theme.default.fg, theme.default.bg, theme);
        const colors = theme.default.colors;
        if (!colors) {
            return { fg: "", bg: "" };
        }
        const fgColor = colors["editor.foreground"];
        const fg = fgColor ? "color: " + fgColor + ";" : "";
        const bgColor = colors["editor.background"];
        const bg = bgColor ? "background-color: " + bgColor + ";" : "";
        return { fg, bg };
    }

    let baseColors: Promise<BaseColors> = $derived(getBaseColors(syntaxHighlightingTheme, syntaxHighlighting));
</script>

{#await Promise.all([baseColors, patchLines])}
    <div class="flex items-center justify-center bg-gray-300 p-4">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
    </div>
{:then [baseColors, lines]}
    {#each lines as line (line)}
        {@const lineType = patchLineTypeProps[line.type]}
        {@const innerLineType = innerPatchLineTypeProps[line.innerPatchLineType]}
        <div style="{baseColors.bg} {baseColors.fg}">
            <div class="h-auto py-1 ps-0.5 {lineType.classes} flex w-full flex-row break-all">
                {#if lineType.prefix}
                    <span class="inline-block shrink-0 font-mono whitespace-pre-wrap">{lineType.prefix}</span>
                {/if}
                <div class="flex grow items-center">
                    <span class="inline w-full font-mono whitespace-pre-wrap {innerLineType.classes}">
                        {#each line.content as segment, index (index)}
                            {@const Icon = segment.icon}
                            {#if segment.classes}
                                <span class="inline font-mono whitespace-pre-wrap {segment.classes}" style={segment.style || ""}>{segment.text}</span>
                            {:else if Icon}
                                <Icon class="ms-0.5 inline text-red-600" aria-label={segment.caption}></Icon>
                            {:else}<span class="inline font-mono whitespace-pre-wrap" style={segment.style || ""}>{segment.text}</span>{/if}
                        {/each}
                    </span>
                </div>
            </div>
        </div>
    {/each}
{/await}
