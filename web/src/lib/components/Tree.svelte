<script lang="ts" generics="T">
    import { type Snippet, untrack } from "svelte";
    import { collectAllNodes, filteredView, type TreeNode, type TreeNodeView } from "$lib/components/scripts/Tree.svelte";

    interface Props {
        roots: TreeNode<T>[];
        nodeRenderer: Snippet<
            [
                {
                    node: TreeNodeView<T>;
                    collapsed: boolean;
                    toggleCollapse: () => void;
                },
            ]
        >;
        childWrapper?: Snippet<
            [
                {
                    node: TreeNodeView<T>;
                    collapsed: boolean;
                    children: Snippet<[{ node: TreeNodeView<T> }]>;
                },
            ]
        > | null;
        filter?: ((node: TreeNode<T>) => boolean) | null;
    }

    let { roots, nodeRenderer, childWrapper = null, filter = null }: Props = $props();

    let collapsedNodes: Set<TreeNode<T>> = $state(new Set());
    let allNodesSet = $derived(collectAllNodes(roots));
    let filteredRoots: Set<TreeNodeView<T>> = $derived(filteredView(roots, filter));

    $effect(() => {
        // Untrack to avoid infinite loop
        const untrackedCollapsed = untrack(() => collapsedNodes);
        const collapsedCopy = new Set(untrackedCollapsed);
        for (const c of untrackedCollapsed) {
            // Remove no longer existing nodes from the collapsed set
            if (!allNodesSet.has(c)) {
                collapsedCopy.delete(c);
            }
        }
        collapsedNodes = collapsedCopy;
    });

    function toggleCollapse(node: TreeNode<T>) {
        const copy = new Set(collapsedNodes);
        if (copy.has(node)) {
            copy.delete(node);
        } else {
            copy.add(node);
        }
        collapsedNodes = copy;
    }
</script>

{#snippet renderNode({ node })}
    {@render nodeRenderer({ node, collapsed: collapsedNodes.has(node.backingNode), toggleCollapse: () => toggleCollapse(node.backingNode) })}
    {#if !collapsedNodes.has(node.backingNode) && node.visibleChildren.length > 0}
        {#if childWrapper !== null}
            {@render childWrapper({ node, collapsed: collapsedNodes.has(node.backingNode), children: renderChildren })}
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

{#each filteredRoots as root (root)}
    {@render renderNode({ node: root })}
{/each}
