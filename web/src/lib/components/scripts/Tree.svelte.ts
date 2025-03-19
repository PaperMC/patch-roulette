export type TreeNode<T> = {
    children: TreeNode<T>[];
    data: T;
};
