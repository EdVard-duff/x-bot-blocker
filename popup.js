// popup.js - 插件弹出窗口的JavaScript逻辑
// 监听 'DOMContentLoaded' 事件，这是一个当 HTML 文档被完全加载和解析完成时触发的事件，但不包括样式表、图像和子框架的加载。
document.addEventListener('DOMContentLoaded', function() {
  const saveBtn = document.getElementById('save-btn');
  const blockKeywordsTextarea = document.getElementById('block-keywords');
  const enableAutoBlockCheckbox = document.getElementById('enable-auto-block');
  const blockedCountElement = document.getElementById('blocked-count');
  const statusMessageElement = document.getElementById('status-message');
  
  // 从存储中加载设置
  chrome.storage.sync.get({ // items 包含从存储中检索到的数据
    blockKeywords: '',
    enableAutoBlock: true,
    blockedCount: 0
  }, function(items) {
    blockKeywordsTextarea.value = items.blockKeywords;
    enableAutoBlockCheckbox.checked = items.enableAutoBlock;
    blockedCountElement.textContent = items.blockedCount;
  });
  
  // 保存设置
  saveBtn.addEventListener('click', function() {
    const blockKeywords = blockKeywordsTextarea.value;
    const enableAutoBlock = enableAutoBlockCheckbox.checked;
    
    chrome.storage.sync.set({
      blockKeywords: blockKeywords,
      enableAutoBlock: enableAutoBlock
    }, function() {
      // 更新状态消息
      statusMessageElement.textContent = '设置已保存！';
      statusMessageElement.className = 'status success';
      
      // 通知内容脚本设置已更新
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsUpdated',
          settings: {
            blockKeywords: blockKeywords.split('\n').filter(Boolean),
            enableAutoBlock: enableAutoBlock
          }
        });
      });
      
      // 5秒后隐藏状态消息
      setTimeout(function() {
        statusMessageElement.textContent = '';
        statusMessageElement.className = 'status';
      }, 5000);
    });
  });
  
  // 更新屏蔽计数
  chrome.storage.sync.onChanged.addListener(function(changes) { // 监听存储中数据的变化
    if (changes.blockedCount) {
      blockedCountElement.textContent = changes.blockedCount.newValue;
    }
  });
});
