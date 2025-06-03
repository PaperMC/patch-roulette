import { onMount } from "svelte";
import { on } from "svelte/events";

export function capitalizeFirstLetter(val: string): string {
    return val.charAt(0).toUpperCase() + val.slice(1);
}

// Watches for changes to local storage in other tabs
export function watchLocalStorage(key: string, callback: (newValue: string | null) => void) {
    onMount(() => {
        function storageChanged(event: StorageEvent) {
            if (event.storageArea === localStorage && event.key === key) {
                callback(event.newValue);
            }
        }

        const destroy = on(window, "storage", storageChanged);
        return { destroy };
    });
}
