export const defaultViewerUrl = "https://patch-roulette.papermc.io/";

export async function getViewerUrl() {
    let url = defaultViewerUrl;
    const data = await chrome.storage.sync.get("url");
    if (data.url) {
        url = data.url;
    }
    return url;
}

export async function openInPatchRoulette(url: string) {
    const viewerUrl = await getViewerUrl();
    try {
        if (url.startsWith(viewerUrl)) {
            return;
        }
        const newUrl = viewerUrl + "?github_url=" + encodeURIComponent(url);
        const activeTab = await getActiveTab();
        await chrome.tabs.create({
            url: newUrl,
            active: true,
            index: activeTab !== null ? activeTab.index + 1 : undefined,
        });
    } catch (error) {
        console.error("Error creating new tab:", error);
    }
}

export async function getActiveTab() {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length !== 1) {
        return null;
    }
    return activeTabs[0];
}
