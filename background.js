// background.js - 后台脚本
chrome.runtime.onInstalled.addListener(function () {
  // 初始化存储
  chrome.storage.sync.get(["blockWords", "blockedCount", "autoMode"], function (data) {
    if (!data.blockWords) {
      chrome.storage.sync.set({ blockWords: [] });
    }
    if (!data.blockedCount) {
      chrome.storage.sync.set({ blockedCount: 0 });
    }
    if (data.autoMode === undefined) {
      chrome.storage.sync.set({ autoMode: false });
    }
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getBlockWords") {
    chrome.storage.sync.get("blockWords", function (data) {
      sendResponse({ blockWords: data.blockWords || [] });
    });
    return true; // 异步响应
  } else if (request.action === "getAutoMode") {
    chrome.storage.sync.get("autoMode", function (data) {
      sendResponse({ autoMode: data.autoMode || false });
    });
    return true; // 异步响应
  } else if (request.action === "incrementBlockCount") {
    chrome.storage.sync.get("blockedCount", function (data) {
      const newCount = (data.blockedCount || 0) + 1;
      chrome.storage.sync.set({ blockedCount: newCount });
    });
  }
});