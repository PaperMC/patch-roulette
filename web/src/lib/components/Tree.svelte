<script lang="ts" generics="T">
    import { type TreeProps, TreeState } from "$lib/components/scripts/Tree.svelte";

    let { instance = $bindable(undefined), roots, nodeRenderer, childWrapper = null, filter = null }: TreeProps<T> = $props();

    instance = new TreeState({ roots: () => roots, filter: () => filter });

    function requireInstance() {
        if (instance === undefined) {
            throw new Error("Tree instance is not defined");
        }
        return instance;
    }
</script>

{#snippet renderNode({ node })}
    {@const collapsed = requireInstance().collapsedNodes.has(node.backingNode)}
    {@render nodeRenderer({ node, collapsed, toggleCollapse: () => requireInstance().toggleCollapse(node.backingNode) })}
    {#if !collapsed && node.visibleChildren.length > 0}
        {#if childWrapper !== null}
            {@render childWrapper({ node, collapsed, children: renderChildren })}
        {:else}
            <div class="ps-4">
                {@render renderChildren({ node })}
            </div>
        {/if}
    {/if}
{/snippet}

{#snippet renderChildren({ node })}
    {#each node.visibleChildren as childNode (childNode)}
        {@render renderNode({ node: childNode })}
    {/each}
{/snippet}

{#each requireInstance().filteredRoots as root (root)}
    {@render renderNode({ node: root })}
{/each}
