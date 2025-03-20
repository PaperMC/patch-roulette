export type TreeNode<T> = {
    children: TreeNode<T>[];
    data: T;
};

export interface TreeNodeView<T> extends TreeNode<T> {
    backingNode: TreeNode<T>;
    visibleChildren: TreeNodeView<T>[];
}

export function collectAllNodes<T>(roots: TreeNode<T>[]): Set<TreeNode<T>> {
    const allNodes = new Set<TreeNode<T>>();
    roots.forEach((root) => {
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop()!;
            allNodes.add(node);
            stack.push(...node.children);
        }
    });
    return allNodes;
}

// Keep any nodes where the filter passes and all their parents
export function filteredView<T>(roots: TreeNode<T>[], filter: ((node: TreeNode<T>) => boolean) | null): Set<TreeNodeView<T>> {
    if (filter === null) {
        function walkDirect(node: TreeNode<T>): TreeNodeView<T> {
            return { ...node, backingNode: node, visibleChildren: node.children.map(walkDirect) };
        }
        return new Set(roots.map((root) => walkDirect(root)));
    }

    function walkFiltered(node: TreeNode<T>): TreeNodeView<T> | null {
        let pass = filter!(node);
        const nodeView: TreeNodeView<T> = { ...node, backingNode: node, visibleChildren: [] };

        for (const child of node.children) {
            const newChild = walkFiltered(child);
            if (newChild) {
                pass = true;
                nodeView.visibleChildren.push(newChild);
            }
        }

        return pass ? nodeView : null;
    }

    const filtered: Set<TreeNodeView<T>> = new Set<TreeNodeView<T>>();

    for (const root of roots) {
        const rootView = walkFiltered(root);
        if (rootView) {
            filtered.add(rootView);
        }
    }

    return filtered;
}
