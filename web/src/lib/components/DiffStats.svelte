<script lang="ts">
    import { Tooltip } from "bits-ui";

    let { remove, add }: { remove: number; add: number } = $props();

    function getAddBarPercentage() {
        if (add === 0) {
            return "0%";
        }
        return (add / (add + remove)) * 100 + "%";
    }

    function getAddBarStyle() {
        if (add === 0) {
            return "display: none;";
        }
        return `width: ${getAddBarPercentage()};`;
    }

    function getRemoveBarPercentage() {
        if (remove === 0) {
            return "0%";
        }
        return (remove / (add + remove)) * 100 + "%";
    }

    function getRemoveBarStyle() {
        if (remove === 0) {
            return "display: none;";
        }
        return `width: ${getRemoveBarPercentage()}; left: ${getAddBarPercentage()};`;
    }

    function getAddRemoveRatio() {
        return getRatio(add, remove);
    }

    /**
     * Calculates the ratio of two numbers a and b, scaled to a given base and rounded to two decimal places.
     *
     * @param a first number
     * @param b second number
     * @param base base to scale the ratio
     */
    function getRatio(a: number, b: number, base: number = 10): [string, string] {
        if (a === 0 && b === 0) return ["0", "0"];
        if (a === 0) return ["0", b.toString()];
        if (b === 0) return [a.toString(), "0"];

        const larger = Math.max(Math.abs(a), Math.abs(b));
        const ratioA = (a / larger) * base;
        const ratioB = (b / larger) * base;

        const formatNumber = (num: number) => (Math.round(num * 100) / 100).toString();
        return [formatNumber(ratioA), formatNumber(ratioB)];
    }
</script>

<div class="flex flex-row items-center gap-1">
    <span class="text-sm text-green-600 dark:text-green-400">+{add.toLocaleString()}</span>
    <span class="text-sm text-red-600 dark:text-red-400">-{remove.toLocaleString()}</span>
    <Tooltip.Provider delayDuration={100}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <div class="relative h-3 w-12 bg-gray-300 dark:bg-gray-700">
                    <div
                        class="absolute top-0 left-0 h-3 border border-green-700 bg-green-600 dark:border-green-600 dark:bg-green-400"
                        style={getAddBarStyle()}
                    ></div>
                    <div class="absolute top-0 h-3 border border-red-700 bg-red-600 dark:border-red-600 dark:bg-red-400" style={getRemoveBarStyle()}></div>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Content class="rounded-sm border border-gray-300 bg-white px-1 py-0.5 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-950">
                {@const [ratioAdd, ratioRemove] = getAddRemoveRatio()}
                <span class="text-green-600 dark:text-green-400">+{ratioAdd}</span>:<span class="text-red-600 dark:text-red-400">-{ratioRemove}</span>
            </Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>
</div>
