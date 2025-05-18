<script lang="ts">
    import FileInput from "$lib/components/files/FileInput.svelte";

    interface Props {
        placeholder: string;
        file?: File;
    }

    let { placeholder = "Select File", file = $bindable<File | undefined>(undefined) }: Props = $props();
</script>

<FileInput bind:file class="flex w-fit items-center gap-2 rounded-md border btn-ghost px-2 py-1 has-focus-visible:outline-2">
    <span class="iconify size-4 shrink-0 text-em-disabled octicon--file-16"></span>
    {#if file}
        {file.name}
    {:else}
        {placeholder}
    {/if}
    <span class="iconify size-4 shrink-0 text-em-disabled octicon--triangle-down-16"></span>
</FileInput>
