// 點擊工具列圖示：若工具頁已開啟則切換過去，否則開新分頁。
const APP_URL = chrome.runtime.getURL('app.html');

chrome.action.onClicked.addListener(async () => {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['TAB'],
      documentUrls: [APP_URL]
    });
    const existing = contexts.find((c) => c.tabId >= 0);
    if (existing) {
      await chrome.tabs.update(existing.tabId, { active: true });
      if (existing.windowId >= 0) await chrome.windows.update(existing.windowId, { focused: true });
      return;
    }
  } catch (e) {
    // getContexts 不支援時（舊版 Chrome）直接開新分頁
  }
  await chrome.tabs.create({ url: APP_URL });
});
