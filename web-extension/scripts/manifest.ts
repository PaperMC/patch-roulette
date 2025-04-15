import { Manifest } from "webextension-polyfill";
import pkg from "../package.json";

const firefox = Bun.env.EXTENSION === "firefox";

await writeManifest();

async function writeManifest() {
    const manifest = makeManifest();
    const path = Bun.file("dist/manifest.json");
    if (await path.exists()) {
        await path.delete();
    }
    const manifestString = JSON.stringify(manifest, null, 2);
    await Bun.write(path, manifestString);
}

function makeManifest(): Manifest.WebExtensionManifest {
    const name = pkg.displayName || pkg.name;
    return {
        manifest_version: 3,
        name,
        version: pkg.version,
        description: pkg.description,
        permissions: ["tabs", "storage", "contextMenus"],
        icons: {
            "128": "favicon.png",
        },
        action: {
            default_title: name,
            default_icon: {
                "128": "favicon.png",
            },
            default_popup: "popup.html",
        },
        background: firefox
            ? {
                  scripts: ["worker.js"],
                  type: "module",
              }
            : {
                  service_worker: "worker.js",
                  type: "module",
              },
        options_ui: {
            page: "options.html",
            open_in_tab: true,
        },
        browser_specific_settings: {
            gecko: {
                id: "patch-roulette@papermc.io",
            },
        },
    };
}
