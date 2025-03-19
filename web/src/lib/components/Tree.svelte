<script lang="ts" generics="T">
    import type { Snippet } from "svelte";
    import type { TreeNode } from "$lib/components/scripts/Tree.svelte";

    interface Props {
        roots: TreeNode<T>[];
        nodeSnippet: Snippet<[{ node: TreeNode<T>; collapsed: boolean; toggleCollapse: () => void }]>;
        // TODO: Move children into the nodeSnippet
        childrenWrapperSnippet?: Snippet<[{ node: TreeNode<T>; collapsed: boolean; children: Snippet<[{ node: TreeNode<T> }]>; style: string }]> | null;
    }

    let { roots, nodeSnippet, childrenWrapperSnippet = null }: Props = $props();

    let collapsed: Set<TreeNode<T>> = $state(new Set());
    $effect(() => {
        // Make sure the collapsed set is cleared when the roots change (i.e. search)
        // TODO: remove no longer existing nodes only
        if (roots.length > 0) {
            collapsed = new Set();
        }

        // TODO in-component filtering
    });
    function toggleCollapse(node: TreeNode<T>) {
        const copy = new Set(collapsed);
        if (copy.has(node)) {
            copy.delete(node);
        } else {
            copy.add(node);
        }
        collapsed = copy;
    }
</script>

{#snippet renderNode({ node })}
    {@render nodeSnippet({ node, collapsed: collapsed.has(node), toggleCollapse: () => toggleCollapse(node) })}
    {#if !collapsed.has(node) && node.children.length > 0}
        {#if childrenWrapperSnippet !== null}
            {@render childrenWrapperSnippet({ node, collapsed: collapsed.has(node), children: renderChildren, style: "padding-inline-start: 1rem;" })}
        {:else}
            <div style="padding-inline-start: 1rem;">
                {@render renderChildren({ node })}
            </div>
        {/if}
    {/if}
{/snippet}

{#snippet renderChildren({ node })}
    {#each node.children as childNode (childNode)}
        {@render renderNode({ node: childNode })}
    {/each}
{/snippet}

{#each roots as root (root)}
    {@render renderNode({ node: root })}
{/each}
