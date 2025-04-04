(function() {
  let settings = {
    blockKeywords: [],
    enableAutoBlock: true
  };
  
  // 从存储中加载设置
  chrome.storage.sync.get({
    blockKeywords: '',
    enableAutoBlock: true,
    blockedUsers: []
  }, function(items) {
    settings.blockKeywords = items.blockKeywords.split('\n').filter(Boolean);
    settings.enableAutoBlock = items.enableAutoBlock;
    settings.blockedUsers = items.blockedUsers;
    
    // 初始化观察器
    initObserver();
  });
  
  // 监听来自弹出窗口的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'settingsUpdated') {
      settings = request.settings;
      settings.blockedUsers = settings.blockedUsers || [];
    }
  });
  
  // 初始化MutationObserver以监视DOM变化
  function initObserver() {
    const observer = new MutationObserver(function(mutations) {
      if (!settings.enableAutoBlock) return;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          scanForComments();
        }
      }
    });
    
    // 开始观察文档体的所有子树变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 立即扫描当前页面
    scanForComments();
  }
  
  // 扫描评论（主函数）
  function scanForComments() {
    // X平台上的评论容器选择器可能会变化，需要根据实际情况调整
    const commentElements = document.querySelectorAll('[data-testid="tweet"]');
    
    commentElements.forEach(function(commentElement) {
      // 确保我们没有已经处理过这个元素
      if (commentElement.dataset.processed) return;
      commentElement.dataset.processed = 'true';
      
      try {
        // 提取评论信息
        const commentInfo = extractCommentInfo(commentElement);
        if (!commentInfo) return;
        
        // 检查是否包含屏蔽关键词
        const keywordMatch = checkForBlockedKeywords(commentInfo.username, commentInfo.content);
        if (!keywordMatch) return;
        
        // 获取用户实际用户名
        const actualUsername = extractActualUsername(commentInfo.usernameElement);
        if (!actualUsername) return;
        
        // 检查是否已经屏蔽过该用户
        if (settings.blockedUsers.includes(actualUsername)) return;
        
        // 执行屏蔽操作
        blockUser(commentElement, commentInfo, actualUsername, keywordMatch);
      } catch (error) {
        console.error('X平台自动屏蔽器出错:', error);
      }
    });
  }
  
  // 提取评论信息
  function extractCommentInfo(commentElement) {
    // 获取用户名元素
    const usernameElement = commentElement.querySelector('[data-testid="User-Name"]');
    if (!usernameElement) return null;
    
    // 获取用户名文本
    const username = usernameElement.textContent.trim();
    
    // 获取评论内容
    const contentElement = commentElement.querySelector('[data-testid="tweetText"]');
    const content = contentElement ? contentElement.textContent.trim() : '';
    
    return {
      usernameElement,
      username,
      content
    };
  }
  
  // 检查是否包含屏蔽关键词
  function checkForBlockedKeywords(username, content) {
    // 检查用户名或内容是否包含关键词
    const matchedKeyword = settings.blockKeywords.find(keyword => 
      username.toLowerCase().includes(keyword.toLowerCase()) || 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!matchedKeyword) return null;
    
    // 判断匹配原因
    const matchReason = username.toLowerCase().includes(matchedKeyword.toLowerCase()) 
      ? 'username' 
      : 'content';
    
    return {
      keyword: matchedKeyword,
      reason: matchReason
    };
  }
  
  // 提取用户的实际用户名（@用户名）
  function extractActualUsername(usernameElement) {
    const userLink = usernameElement.querySelector('a[href*="/"]');
    if (!userLink) return null;
    
    const href = userLink.getAttribute('href');
    const usernameParts = href.split('/');
    return usernameParts[usernameParts.length - 1];
  }
  
  // 执行屏蔽操作
  function blockUser(commentElement, commentInfo, actualUsername, keywordMatch) {
    // 找到屏蔽按钮
    const menuButton = commentElement.querySelector('[data-testid="caret"]');
    if (!menuButton) return;
    
    // 通过模拟点击屏蔽按钮来屏蔽用户
    menuButton.click();
    
    // 等待菜单出现
    setTimeout(function() {
      clickBlockOption();
    }, 500);
    
    // 点击屏蔽选项
    function clickBlockOption() {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      for (const item of menuItems) {
        if (item.textContent.includes('屏蔽') || item.textContent.includes('Block')) {
          item.click();
          
          // 等待确认对话框出现
          setTimeout(function() {
            confirmBlockAction();
          }, 500);
          return;
        }
      }
    }
    
    // 确认屏蔽操作
    function confirmBlockAction() {
      const confirmButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmButton) {
        confirmButton.click();
        
        // 通知后台脚本用户已被屏蔽
        notifyBackgroundScript();
      }
    }
    
    // 通知后台脚本
    function notifyBackgroundScript() {
      chrome.runtime.sendMessage({
        action: 'blockUser',
        username: actualUsername,
        reason: keywordMatch.reason,
        matchedKeyword: keywordMatch.keyword
      });
    }
  }
})();