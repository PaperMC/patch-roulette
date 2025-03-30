<script lang="ts">
    import { mergeProps, Switch, type WithoutChildrenOrChild } from "bits-ui";

    let {
        checked = $bindable(false),
        ref = $bindable(null),
        size = 5,
        padding = 0.5,
        ...restProps
    }: WithoutChildrenOrChild<Switch.RootProps> & {
        size?: number;
        padding?: number;
    } = $props();

    const ourProps = {
        class: "block cursor-pointer overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700 transition-colors ease-in-out data-[state='checked']:bg-blue-500",
        style: `height: ${0.25 * (size + padding * 2)}rem; width: ${0.25 * (size * 2 + padding * 2)}rem; padding: ${padding * 0.25}rem;`,
    };
    const mergedProps = $derived(mergeProps(restProps, ourProps));

    let translate = $derived.by(() => {
        if (checked) return 0.25 * size + "rem";
        return "0";
    });
</script>

<Switch.Root bind:checked bind:ref {...mergedProps}>
    <Switch.Thumb
        class="block translate-0 transform rounded-full bg-white transition-transform duration-200 ease-in dark:bg-gray-950"
        style="height: {0.25 * size}rem; width: {0.25 * size}rem; --tw-translate-x: {translate};"
        aria-hidden="true"
    />
</Switch.Root>
