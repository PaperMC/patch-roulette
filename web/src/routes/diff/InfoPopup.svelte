<script lang="ts">
    import { Popover } from "bits-ui";

    let { children } = $props();
</script>

<Popover.Root>
    <Popover.Trigger
        aria-label="Actions"
        class="flex size-6 items-center justify-center self-center rounded-md btn-ghost p-0.5 data-[state=open]:btn-ghost-visible"
    >
        <span aria-hidden="true" class="iconify size-4 bg-primary octicon--info-16"></span>
    </Popover.Trigger>
    <Popover.Portal>
        <Popover.Content class="z-50 max-w-64 rounded-sm border bg-neutral px-2 py-1 text-sm">
            {@render children?.()}
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
