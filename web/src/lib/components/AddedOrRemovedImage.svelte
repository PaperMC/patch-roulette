<script lang="ts">
    import AddIcon from "virtual:icons/octicon/file-added-16";
    import RemoveIcon from "virtual:icons/octicon/file-removed-16";

    type Mode = "added" | "removed";
    interface Props {
        file: string;
        mode: Mode;
    }

    const { file, mode }: Props = $props();

    let Icon = $derived(mode === "added" ? AddIcon : RemoveIcon);
    let borderColor = $derived(mode === "added" ? "border-green-600" : "border-red-600");
    let iconColor = $derived(mode === "added" ? "text-green-600" : "text-red-600");
</script>

<div class="grid w-full grid-cols-1 gap-4 bg-gray-300 p-4">
    <div class="flex flex-col items-center justify-center gap-4">
        <img src={file} alt={mode} class="png-bg h-auto border-2 {borderColor} shadow-md" />
        <div class="rounded-sm bg-white p-2 {iconColor} shadow-sm">
            <Icon />
        </div>
    </div>
</div>
