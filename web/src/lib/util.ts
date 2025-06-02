import { onMount } from "svelte";
import type { Action } from "svelte/action";

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

        window.addEventListener("storage", storageChanged);
        return {
            destroy() {
                window.removeEventListener("storage", storageChanged);
            },
        };
    });
}

export const resizeObserver: Action<HTMLElement, ResizeObserverCallback> = (node, callback) => {
    const observer = new ResizeObserver(callback);
    observer.observe(node);
    return {
        destroy() {
            observer.disconnect();
        },
    };
};
