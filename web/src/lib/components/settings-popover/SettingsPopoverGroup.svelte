<script lang="ts">
    import { useId, Label } from "bits-ui";
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children?: Snippet<[]>;
    }

    let { children, title }: Props = $props();

    const groupId = useId();
    const labelId = useId();
</script>

<div id={groupId} aria-labelledby={labelId} class="flex flex-col" role="group">
    <Label.Root id={labelId} for={groupId} class="px-2 pt-4 pb-1 font-semibold">{title}</Label.Root>
    {@render children?.()}
</div>
