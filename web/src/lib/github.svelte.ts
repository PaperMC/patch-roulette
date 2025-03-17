import { browser } from "$app/environment";
import type { components } from "@octokit/openapi-types";

export const githubUsername: { value: string | null } = $state({ value: null });

export function getGithubUsername(): string | null {
    if (!browser) {
        return null;
    }
    return githubUsername.value || localStorage.getItem("github_username");
}

export type GithubPRFile = {
    filename: string;
    previous_filename?: string;
    patch: string;
};
export type GHUser = components["schemas"]["private-user"];
export type TokenResponse = {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
};

export async function fetchGithubUserToken(code: string): Promise<TokenResponse> {
    const response = await fetch(new URL(`${window.location.origin}/api/github/token?code=${code}`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (response.ok) {
        return await response.json();
    } else {
        throw Error(`Failed to retrieve token (${response.status}): ${await response.text()}`);
    }
}

export async function fetchCurrentGithubUser(token: string): Promise<GHUser> {
    const response = await fetch(`${window.location.origin}/api/github/user`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (response.ok) {
        return await response.json();
    } else {
        throw Error(`Failed to retrieve user (${response.status}): ${await response.text()}`);
    }
}
