import { browser } from "$app/environment";
import { resolve } from "$app/paths";
import { redirect } from "@sveltejs/kit";

export function load() {
    if (browser && localStorage.getItem("token") !== null) {
        redirect(307, resolve("/"));
    }
}
