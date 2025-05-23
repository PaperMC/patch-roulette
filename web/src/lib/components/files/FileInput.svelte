<script lang="ts">
    import { useId } from "bits-ui";
    import { type RestProps } from "$lib/types";
    import { type Snippet } from "svelte";
    import { watch } from "runed";

    type Props = {
        children?: Snippet<[{ files?: FileList }]>;
        multiple?: boolean;
        files?: FileList;
        file?: File;
        onChange?: (file?: File) => void;
        onChangeMultiple?: (files?: FileList) => void;
    } & RestProps;

    let {
        children,
        multiple = false,
        files = $bindable<FileList | undefined>(undefined),
        file = $bindable<File | undefined>(undefined),
        onChange,
        onChangeMultiple,
        ...restProps
    }: Props = $props();

    // Update file when files change and multiple is false
    watch(
        () => files,
        (newFiles) => {
            if (multiple) {
                return;
            }

            if (newFiles && newFiles.length > 0) {
                file = newFiles[0];
            } else {
                file = undefined;
            }
        },
    );

    // Clear file when multiple is true
    watch(
        () => multiple,
        (isMultiple) => {
            if (isMultiple) {
                file = undefined;
            }
        },
    );

    // Invoke change callbacks
    watch([() => files, () => file], ([newFiles, newFile]) => {
        if (multiple) {
            onChangeMultiple?.(newFiles);
        } else {
            onChange?.(newFile);
        }
    });

    const labelId = useId();
    const inputId = useId();
</script>

<label id={labelId} for={inputId} {...restProps}>
    {@render children?.({ files })}
    <input id={inputId} aria-labelledby={labelId} type="file" bind:files class="sr-only" {multiple} />
</label>
