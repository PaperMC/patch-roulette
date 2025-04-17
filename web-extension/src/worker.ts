import { openInPatchRoulette } from "./common.ts";

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "open-in-patch-roulette",
        title: "Open in Patch Roulette Diff Viewer",
        contexts: ["all"],
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        let url = info.linkUrl || info.srcUrl || info.selectionText || info.frameUrl || info.pageUrl;
        if (!url && tab && tab.url) {
            url = tab.url;
        }
        if (url) {
            await openInPatchRoulette(url);
        }
    });
});
