const defaultUrl = "https://patch-roulette.papermc.io/diff-viewer/multi-file";
let currentUrl = defaultUrl;
const data = await chrome.storage.sync.get("url");
if (data.url) {
    currentUrl = data.url;
}

const button = document.getElementById("open-button") as HTMLButtonElement;
const input = document.getElementById("url-input") as HTMLInputElement;

input.placeholder = defaultUrl;
input.value = currentUrl;

if (!button || !input) {
    throw new Error("Element not found");
}

button.addEventListener("click", async () => {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length !== 1) {
        console.error("No active tab found");
        return;
    }
    const activeTab = activeTabs[0];
    if (!activeTab.url) {
        console.error("No URL found for the active tab");
        return;
    }
    try {
        const originalUrl = activeTab.url;
        if (originalUrl.startsWith(currentUrl)) {
            return;
        }
        const newUrl = currentUrl + "?github_url=" + encodeURIComponent(originalUrl);
        await chrome.tabs.create({
            url: newUrl,
            active: true,
            index: activeTab.index + 1,
        });
    } catch (error) {
        console.error("Error creating new tab:", error);
    }
});

input.addEventListener("change", async (event) => {
    currentUrl = (event.target as HTMLInputElement).value || defaultUrl;
    await chrome.storage.sync.set({ url: currentUrl });
});
