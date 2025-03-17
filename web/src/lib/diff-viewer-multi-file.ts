import type { FileStatus } from "./github.svelte";

export type FileDetails = {
    content: string;
    fromFile: string;
    toFile: string;
    status: FileStatus;
};

export type FileStatusProps = {
    icon: string;
    classes: string;
    title: string;
};

const addStatusProps: FileStatusProps = {
    icon: "+",
    classes: "bg-green-100 text-green-800 border-green-300",
    title: "Added",
};
const removeStatusProps: FileStatusProps = {
    icon: "-",
    classes: "bg-red-100 text-red-800 border-red-300",
    title: "Removed",
};
const modifyStatusProps: FileStatusProps = {
    icon: "*",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-300",
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
