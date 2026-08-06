// Types matching the backend API JSON exactly (nullable fields!).

export type PatchStatus = "WIP" | "AVAILABLE" | "DONE";

export interface PatchDetails {
    path: string;
    status: PatchStatus;
    responsibleUser: string | null;
    lastUpdated: string | null; // ISO 8601 UTC datetime
    duration: string | null; // ISO 8601 duration
}

export interface Stats {
    total: number;
    available: number;
    wip: number;
    done: number;
    users: UserStats[];
    timeSpent: string; // ISO 8601 duration
}

export interface UserStats {
    rank: number;
    user: string;
    wip: number;
    done: number;
    timeSpent: string; // ISO 8601 duration
}
