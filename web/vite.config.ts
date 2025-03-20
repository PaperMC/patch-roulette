import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";

export default defineConfig(({ mode }) => ({
    plugins: [
        tailwindcss(),
        sveltekit(),
        Icons({
            compiler: "svelte",
        }),
    ],
    server: {
        proxy: {
            "/api": {
                target: mode === "devProd" ? "https://patch-roulette.papermc.io" : "http://localhost:8080",
                changeOrigin: true,
            },
        },
    },
}));
