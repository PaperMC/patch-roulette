import type { Component } from "svelte";
import type { FileStatus } from "./github.svelte";
import AddIcon from "virtual:icons/octicon/diff-added-16";
import RemoveIcon from "virtual:icons/octicon/diff-removed-16";
import ModifyIcon from "virtual:icons/octicon/diff-modified-16";

export type FileDetails = {
    content: string;
    fromFile: string;
    toFile: string;
    status: FileStatus;
};

export type FileStatusProps = {
    icon: Component;
    classes: string;
    title: string;
};

const addStatusProps: FileStatusProps = {
    icon: AddIcon,
    classes: "text-green-600",
    title: "Added",
};
const removeStatusProps: FileStatusProps = {
    icon: RemoveIcon,
    classes: "text-red-600",
    title: "Removed",
};
const modifyStatusProps: FileStatusProps = {
    icon: ModifyIcon,
    classes: "text-yellow-600",
    title: "Modified",
};

export function getFileStatusProps(status: FileStatus): FileStatusProps {
    switch (status) {
        case "added":
            return addStatusProps;
        case "removed":
            return removeStatusProps;
        default:
            return modifyStatusProps;
    }
}
