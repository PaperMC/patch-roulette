import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type UserConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

function makeConfig(mode: string): UserConfig {
    const config: UserConfig = {
        plugins: [tailwindcss(), sveltekit()],
        server: {
            proxy: {},
        },
    };

    if (mode === "development") {
        config.server!.proxy!["/prod-api-proxy"] = {
            target: "https://patch-roulette.papermc.io",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/prod-api-proxy/, ""),
        };
    }

    return config;
}

export default defineConfig(({ mode }) => makeConfig(mode));
