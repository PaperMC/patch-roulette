<script lang="ts">
    import { mergeProps, Toggle } from "bits-ui";

    let { value = $bindable<boolean>(), size = 5, padding = 0.5, ...restProps } = $props();

    const ourProps = {
        class: "block cursor-pointer overflow-hidden rounded-full bg-gray-300 transition-colors ease-in-out data-[state=on]:bg-blue-500",
        style: `height: ${0.25 * (size + padding * 2)}rem; width: ${0.25 * (size * 2 + padding * 2)}rem; padding: ${padding * 0.25}rem;`,
    };
    const mergedProps = $derived(mergeProps(restProps, ourProps));

    let translate = $derived.by(() => {
        if (value) return 0.25 * size + "rem";
        return "0";
    });
</script>

<Toggle.Root {...mergedProps} bind:pressed={value}>
    <span
        class="block translate-0 transform rounded-full bg-white transition-transform duration-200 ease-in"
        style="height: {0.25 * size}rem; width: {0.25 * size}rem; --tw-translate-x: {translate};"
        aria-hidden="true"
    ></span>
</Toggle.Root>
