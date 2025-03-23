<script lang="ts">
    import Columns from "virtual:icons/octicon/columns-16";
    import Image from "virtual:icons/octicon/image-16";
    import Grabber from "virtual:icons/octicon/grabber-16";
    import AddIcon from "virtual:icons/octicon/file-added-16";
    import RemoveIcon from "virtual:icons/octicon/file-removed-16";

    interface Props {
        fileA: string;
        fileB: string;
    }

    const { fileA, fileB }: Props = $props();

    type Mode = "side-by-side" | "overlay";

    let mode: Mode = $state("side-by-side");
    let percent: number = $state(50);
    let dragging: boolean = $state(false);

    function dragSlider(node: HTMLElement) {
        let containerWidth: number;
        let containerLeft: number;

        function handleMouseDown(event: MouseEvent) {
            if (event.button !== 0) {
                return;
            }
            dragging = true;
            const container = node.parentElement?.parentElement; // Get the relative container
            if (container) {
                const rect = container.getBoundingClientRect();
                containerWidth = rect.width;
                containerLeft = rect.left;
            }
        }

        function handleMouseMove(event: MouseEvent) {
            if (dragging && containerWidth) {
                const newX = event.clientX - containerLeft;
                percent = Math.max(0, Math.min(100, (newX / containerWidth) * 100));
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

<div class="flex flex-col items-center justify-center bg-gray-300 p-4">
    <div class="mb-4 flex flex-row gap-2 rounded-lg bg-white p-2 shadow-sm">
        <button
            type="button"
            class="rounded-sm p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow"
            onclick={() => (mode = "overlay")}
            class:bg-gray-200={mode === "overlay"}
            class:hover:bg-gray-200={mode === "overlay"}
            class:shadow={mode === "overlay"}
        >
            <Image></Image>
        </button>
        <button
            type="button"
            class="rounded-sm p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow"
            onclick={() => (mode = "side-by-side")}
            class:bg-gray-200={mode === "side-by-side"}
            class:hover:bg-gray-200={mode === "side-by-side"}
            class:shadow={mode === "side-by-side"}
        >
            <Columns></Columns>
        </button>
    </div>
    {#if mode === "side-by-side"}
        <div class="flex flex-col gap-4">
            <div class="flex flex-row gap-4">
                <img src={fileA} alt="A" class="png-bg h-auto w-full border border-gray-600 shadow-md" />
                <img src={fileB} alt="B" class="png-bg h-auto w-full border border-gray-600 shadow-md" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex justify-center">
                    <div class="rounded-sm bg-white p-2 text-red-600 shadow-sm">
                        <RemoveIcon></RemoveIcon>
                    </div>
                </div>
                <div class="flex justify-center">
                    <div class="rounded-sm bg-white p-2 text-green-600 shadow-sm">
                        <AddIcon></AddIcon>
                    </div>
                </div>
            </div>
        </div>
    {:else if mode === "overlay"}
        <div class="flex flex-row items-center gap-4">
            <div class="rounded-sm bg-white p-2 text-red-600 shadow-sm">
                <RemoveIcon></RemoveIcon>
            </div>
            <div class="relative grid grid-cols-1 gap-4">
                <img src={fileA} alt="A" class="png-bg h-auto w-full border border-gray-600 shadow-md" />
                <img src={fileB} alt="B" class="absolute h-auto max-w-full border border-gray-600 shadow-md" style="clip-path: inset(0 0 0 {percent}%);" />
                <div class="absolute top-1/2 h-full w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gray-600" style="left: calc({percent}%);"></div>
                <div
                    use:dragSlider
                    class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-col-resize rounded-sm bg-white px-0.5 py-1 shadow-sm select-none"
                    style="left: calc({percent}%);"
                >
                    <Grabber></Grabber>
                </div>
            </div>
            <div class="rounded-sm bg-white p-2 text-green-600 shadow-sm">
                <AddIcon></AddIcon>
            </div>
        </div>
    {/if}
</div>

<style>
    .png-bg {
        background:
            linear-gradient(45deg, #e6e9ea 25%, transparent 0), linear-gradient(-45deg, #e6e9ea 25%, transparent 0),
            linear-gradient(45deg, transparent 75%, #e6e9ea 0), linear-gradient(-45deg, transparent 75%, #e6e9ea 0);
        background-size: 24px 24px;
        background-position:
            0 0,
            0 12px,
            12px -12px,
            -12px 0;
    }
</style>
