<script lang="ts">
    import Columns from "virtual:icons/octicon/columns-16";
    import Image from "virtual:icons/octicon/image-16";
    import Grabber from "virtual:icons/octicon/grabber-16";
    import AddIcon from "virtual:icons/octicon/file-added-16";
    import RemoveIcon from "virtual:icons/octicon/file-removed-16";
    import type { Component } from "svelte";
    import { Slider } from "bits-ui";

    interface Props {
        fileA: string;
        fileB: string;
    }

    const { fileA, fileB }: Props = $props();

    type Mode = "side-by-side" | "slide" | "fade";
    type ImageDimensions = { width: number; height: number };
    type DimensionData = {
        a: ImageDimensions;
        b: ImageDimensions;
        widest: string;
        narrowerMaxW: string;
    };

    let dimensions: Promise<DimensionData> = $derived.by(async () => {
        const [a, b] = await Promise.all([getDimensions(fileA), getDimensions(fileB)]);
        const widest = a.width > b.width ? "a" : "b";
        const widerDims = widest === "a" ? a : b;
        const narrowerDims = widest === "a" ? b : a;
        const narrowerMaxW = (narrowerDims.width / widerDims.width) * 100;
        return { a, b, widest, narrowerMaxW: `max-width: ${narrowerMaxW}%;` };
    });
    let mode: Mode = $state("side-by-side");
    let percentShown: number = $state(50);
    let percentDragged: number = $state(50);
    let dragging: boolean = $state(false);
    let fadePercent: number = $state(50);

    async function getDimensions(src: string): Promise<ImageDimensions> {
        const res = await fetch(src);
        if (!res.ok) {
            throw new Error(`Failed to fetch image (${res.status}): ${await res.text()}`);
        }
        const { width, height } = await createImageBitmap(await res.blob());
        return { width, height };
    }

    function getMaxW(img: string, dims: DimensionData): string {
        if (img === "a") {
            if (dims.widest === "b") {
                return dims.narrowerMaxW;
            }
        } else if (img === "b") {
            if (dims.widest === "a") {
                return dims.narrowerMaxW;
            }
        }
        return "";
    }

    let overlayImgB: HTMLImageElement;

    function dragSlider(node: HTMLElement) {
        let containerWidth: number;
        let containerLeft: number;
        let imgBWidth: number;
        let imgBLeft: number;

        function handleMouseDown(event: MouseEvent) {
            if (event.button !== 0) {
                return;
            }

            if (node.parentElement && overlayImgB) {
                const parentRect = node.parentElement.getBoundingClientRect();
                containerWidth = parentRect.width;
                containerLeft = parentRect.left;

                const imgBRect = overlayImgB.getBoundingClientRect();
                imgBWidth = imgBRect.width;
                imgBLeft = imgBRect.left;

                dragging = true;
            }
        }

        function handleMouseMove(event: MouseEvent) {
            if (dragging) {
                percentDragged = Math.max(0, Math.min(100, ((event.clientX - containerLeft) / containerWidth) * 100));
                percentShown = Math.max(0, Math.min(100, ((event.clientX - imgBLeft) / imgBWidth) * 100));
            }
        }

        function handleMouseUp() {
            dragging = false;
        }

        node.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return {
            destroy() {
                node.removeEventListener("mousedown", handleMouseDown);
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            },
        };
    }
</script>

{#snippet modeSelector()}
    {#snippet modeButton(forMode: Mode, Icon: Component)}
        <button
            type="button"
            class="rounded-sm p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow"
            onclick={() => (mode = forMode)}
            class:bg-gray-200={mode === forMode}
            class:hover:bg-gray-200={mode === forMode}
            class:shadow={mode === forMode}
        >
            <Icon />
        </button>
    {/snippet}
    <div class="mb-4 flex flex-row gap-2 rounded-lg bg-white p-2 shadow-sm">
        {@render modeButton("slide", Image)}
        {@render modeButton("side-by-side", Columns)}
        {@render modeButton("fade", Image)}
    </div>
{/snippet}

{#snippet sideBySide(dims: DimensionData)}
    <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col items-center justify-center gap-4">
            <img src={fileA} alt="A" class="png-bg h-auto border-2 border-red-600 shadow-md" style={getMaxW("a", dims)} />
            <div class="rounded-sm bg-white p-2 text-red-600 shadow-sm">
                <RemoveIcon />
            </div>
        </div>
        <div class="flex flex-col items-center justify-center gap-4">
            <img src={fileB} alt="B" class="png-bg h-auto border-2 border-green-600 shadow-md" style={getMaxW("b", dims)} />
            <div class="rounded-sm bg-white p-2 text-green-600 shadow-sm">
                <AddIcon />
            </div>
        </div>
    </div>
{/snippet}

{#snippet slide(dims: DimensionData)}
    <div class="flex flex-row items-center gap-4">
        <div class="rounded-sm bg-white p-2 text-red-600 shadow-sm">
            <RemoveIcon />
        </div>
        <div class="relative grid grid-cols-1 gap-4">
            <img src={fileA} alt="A" class="png-bg h-auto w-full border-2 border-red-600 shadow-md" draggable="false" style={getMaxW("a", dims)} />
            <img
                bind:this={overlayImgB}
                src={fileB}
                alt="B"
                class="png-bg absolute h-auto max-w-full place-self-center border-2 border-green-600 shadow-md"
                draggable="false"
                style="clip-path: inset(0 0 0 {percentShown}%); {getMaxW('b', dims)}"
            />
            <div class="absolute top-1/2 h-full w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gray-600" style="left: calc({percentDragged}%);"></div>
            <div
                use:dragSlider
                class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-col-resize rounded-sm bg-white px-0.5 py-1 shadow-sm select-none"
                style="left: calc({percentDragged}%);"
            >
                <Grabber />
            </div>
        </div>
        <div class="rounded-sm bg-white p-2 text-green-600 shadow-sm">
            <AddIcon />
        </div>
    </div>
{/snippet}

{#snippet fade(dims: DimensionData)}
    <div class="flex flex-row items-center gap-4">
        <div class="rounded-sm bg-white p-2 text-red-600 shadow-sm">
            <RemoveIcon />
        </div>
        <div class="relative grid grid-cols-1 gap-4">
            <img src={fileA} alt="A" class="png-bg h-auto w-full border-2 border-red-600 shadow-md" draggable="false" style={getMaxW("a", dims)} />
            <img
                bind:this={overlayImgB}
                src={fileB}
                alt="B"
                class="png-bg absolute h-auto max-w-full place-self-center border-2 border-green-600 shadow-md"
                draggable="false"
                style="opacity: {fadePercent}%; {getMaxW('b', dims)}"
            />
        </div>
        <div class="rounded-sm bg-white p-2 text-green-600 shadow-sm">
            <AddIcon />
        </div>
    </div>
    <div class="mt-4 flex w-full max-w-[280px] items-center">
        <Slider.Root type="single" bind:value={fadePercent} class="relative flex w-full touch-none items-center select-none">
            <span class="relative h-0.5 w-full grow cursor-pointer overflow-hidden rounded-full bg-blue-500"> </span>
            <Slider.Thumb
                index={0}
                class="block size-4 cursor-pointer rounded-full border-gray-300 bg-white shadow-sm transition-colors hover:border active:scale-[0.98]"
            />
        </Slider.Root>
    </div>
{/snippet}

<div class="flex flex-col items-center justify-center bg-gray-300 p-4">
    {@render modeSelector()}
    {#await dimensions}
        <span>Loading...</span>
    {:then dims}
        {#if mode === "side-by-side"}
            {@render sideBySide(dims)}
        {:else if mode === "slide"}
            {@render slide(dims)}
        {:else if mode === "fade"}
            {@render fade(dims)}
        {/if}
    {/await}
</div>
