// background.js - 后台脚本，处理事件和消息
// 当扩展被安装、更新或 Chrome 浏览器更新时触发
chrome.runtime.onInstalled.addListener(function() {
  // 初始化存储
  chrome.storage.sync.get({
    blockKeywords: '',
    enableAutoBlock: true,
    blockedCount: 0,
    blockedUsers: []
  }, function(items) {
    if (items.blockKeywords === '') {
      chrome.storage.sync.set({
        blockKeywords: '',
        enableAutoBlock: true,
        blockedCount: 0,
        blockedUsers: []
      });
    }
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'blockUser') {
    // 更新已屏蔽的用户列表和计数
    chrome.storage.sync.get({
      blockedUsers: [],
      blockedCount: 0
    }, function(items) {
      if (!items.blockedUsers.includes(request.username)) {
        const updatedBlockedUsers = [...items.blockedUsers, request.username];
        chrome.storage.sync.set({
          blockedUsers: updatedBlockedUsers,
          blockedCount: updatedBlockedUsers.length
        }, function() {
          sendResponse({success: true});
        });
      } else {
        sendResponse({success: false, reason: 'alreadyBlocked'});
      }
    });
    
    // 保持消息通道开放以异步响应
    return true;
  }
});