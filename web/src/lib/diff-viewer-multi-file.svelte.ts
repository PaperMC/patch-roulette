import type { Component } from "svelte";
import type { FileStatus } from "./github.svelte";
import AddIcon from "virtual:icons/octicon/file-added-16";
import RemoveIcon from "virtual:icons/octicon/file-removed-16";
import ModifyIcon from "virtual:icons/octicon/file-diff-16";
import MoveIcon from "virtual:icons/octicon/file-moved-16";

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
const renamedStatusProps: FileStatusProps = {
    icon: MoveIcon,
    classes: "text-gray-600",
    title: "Renamed",
};
const renamedModifiedStatusProps: FileStatusProps = {
    icon: MoveIcon,
    classes: "text-yellow-600",
    title: "Renamed and Modified",
};

export function getFileStatusProps(status: FileStatus): FileStatusProps {
    switch (status) {
        case "added":
            return addStatusProps;
        case "removed":
            return removeStatusProps;
        case "renamed":
            return renamedStatusProps;
        case "renamed_modified":
            return renamedModifiedStatusProps;
        default:
            return modifyStatusProps;
    }
}
