export type PatchStatus = "WIP" | "AVAILABLE" | "DONE";

export type PatchDetails = {
    path: string;
    status: PatchStatus;
    responsibleUser: string;
    lastUpdated: string;
    duration: string;
};

export type Stats = {
    available: number;
    done: number;
    wip: number;
    total: number;
    timeSpent: string;
    users: UserStats[];
};

export type UserStats = {
    user: string;
    wip: number;
    done: number;
    timeSpent: string;
};
