export type PatchDetails = {
    path: string;
    status: PatchStatus;
    responsibleUser: string;
};

export type PatchStatus = "WIP" | "AVAILABLE" | "DONE";
