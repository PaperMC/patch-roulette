import { onMount } from "svelte";
import { fetchApi } from "./api";

let token: string | null = null;

function getUsername() {
    if (token == null) {
        throw new Error("No token present.");
    }
    return atob(token).split(":")[0];
}

async function onLogin() {
    document.getElementById("login-container")!.style.display = "none";

    const contentContainer = document.getElementById("content-container");
    contentContainer!.style.display = "flex";

    document.getElementById("logged-user")!.innerText = getUsername();
}

export function init() {
    onMount(browserInit);
}

function browserInit() {
    token = localStorage.getItem("token");
    if (token) {
        onLogin();
    }

    const loginForm = document.getElementById("login-form");
    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = (document.getElementById("username") as HTMLInputElement).value;
        const password = (document.getElementById("password") as HTMLInputElement).value;
        const encoded = btoa(username + ":" + password);

        const response = await fetchApi("/login", {
            method: "POST",
            token: encoded,
        });

        if (response.ok) {
            localStorage.setItem("token", encoded);
            token = encoded;
            await onLogin();
        } else {
            alert("Invalid login.");
        }
    });

    document.getElementById("select-version")?.addEventListener("click", async () => {
        const mcVersion = (document.getElementById("mcVersion") as HTMLInputElement).value;
        if (!mcVersion) {
            alert("Please enter a Minecraft version.");
            return;
        }

        const response = await fetchApi(`/get-available-patches?minecraftVersion=${mcVersion}`, {
            method: "GET",
            token: localStorage.getItem("token")!,
        });

        if (response.ok) {
            const patches = await response.json();
            const patchesList = document.getElementById("patches-list");
            if (patchesList == null) {
                throw Error("Patches list not found.");
            }
            patchesList.innerHTML = "";

            if (patches.length === 0) {
                patchesList.innerHTML = '<p class="text-gray-500 italic text-center py-4">No patches available for this version.</p>';
            } else {
                patches.forEach((patch: string) => {
                    const patchItem = document.createElement("div");
                    patchItem.className = "patch-item p-2 border-b border-gray-200";
                    patchItem.innerText = patch;
                    patchesList.appendChild(patchItem);
                });
            }

            document.getElementById("patches-container")!.classList.remove("hidden");
        } else {
            alert("Failed to fetch patches. Please try again.");
        }
    });
}
