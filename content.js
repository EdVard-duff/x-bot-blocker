// content.js - 内容脚本，实际执行屏蔽操作
let blockWords = [];
let autoMode = false;
let processedUsers = new Set(); // 跟踪已处理的用户
let isProcessingBlock = false; // 标记是否正在处理屏蔽操作
let blockQueue = []; // 屏蔽队列

// 获取屏蔽词列表
function getBlockWords() {
  chrome.runtime.sendMessage({action: "getBlockWords"}, function(response) {
    if (response && response.blockWords) {
      blockWords = response.blockWords;
    }
  });
}

// 获取自动模式设置
function getAutoMode() {
  chrome.runtime.sendMessage({action: "getAutoMode"}, function(response) {
    if (response && response.autoMode !== undefined) {
      autoMode = response.autoMode;
    }
  });
}

// 初始化获取屏蔽词和自动模式设置
getBlockWords();
getAutoMode();

// 每隔一段时间重新获取屏蔽词和自动模式设置，以便更新
setInterval(() => {
  getBlockWords();
  getAutoMode();
}, 60000); // 每分钟更新一次

// 滚动到指定元素位置
function scrollToElement(element) {
  if (!element) return;
  
  // 计算元素的位置，将其滚动到视窗中央
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // 计算目标位置：元素顶部位置减去视窗高度的一半（使元素位于视窗中央）
  const targetPosition = rect.top + scrollTop - (window.innerHeight / 2);
  
  // 平滑滚动到目标位置
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
  
  // 添加临时高亮效果
  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#FFFF9C'; // 淡黄色高亮
  element.style.transition = 'background-color 2s';
  
  // 2秒后恢复原来的背景色
  setTimeout(() => {
    element.style.backgroundColor = originalBackground;
  }, 2000);
}

// 处理屏蔽队列
function processBlockQueue() {
  if (isProcessingBlock || blockQueue.length === 0) {
    return; // 如果正在处理屏蔽操作或队列为空，则返回
  }
  
  // 设置标志，表示正在处理屏蔽操作
  isProcessingBlock = true;
  
  // 从队列中取出第一个元素
  const commentElement = blockQueue.shift();
  
  // 如果元素已从DOM中移除，则处理下一个
  if (!document.body.contains(commentElement)) {
    isProcessingBlock = false;
    processBlockQueue();
    return;
  }
  
  // 在非自动模式下，先滚动到评论位置
  if (!autoMode) {
    scrollToElement(commentElement);
  }
  
  // 找到并点击屏蔽按钮
  blockUserByElement(commentElement);
}

// 监听屏蔽对话框关闭事件
function setupDialogCloseListener() {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.removedNodes.length > 0) {
        // 检查是否有对话框被移除
        for (let i = 0; i < mutation.removedNodes.length; i++) {
          const node = mutation.removedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE && 
              (node.getAttribute('role') === 'dialog' || 
               node.querySelector('[role="dialog"]'))) {
            // 对话框被关闭，可以处理下一个屏蔽请求
            setTimeout(() => {
              isProcessingBlock = false;
              processBlockQueue();
            }, 500); // 短暂延迟，确保UI完全更新
          }
        }
      }
    }
  });
  
  // 观察整个文档以捕获对话框关闭
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 检查评论内容和用户名是否包含屏蔽词
function checkAndBlockUser(commentElement) {
  // 获取评论区域
  if (!commentElement) return;
  
  // 尝试找到用户名元素 (X平台的DOM结构可能会变化，需要进行调整)
  const usernameElement = commentElement.querySelector('[data-testid="User-Name"]');
  if (!usernameElement) return;
  
  // 获取用户名
  const username = usernameElement.textContent;
  
  // 如果已经处理过这个用户，则跳过
  if (processedUsers.has(username)) return;
  
  // 获取评论内容
  const commentTextElement = commentElement.querySelector('[data-testid="tweetText"]');
  const commentText = commentTextElement ? commentTextElement.textContent : '';
  
  // 检查用户名或评论内容是否包含屏蔽词
  const shouldBlock = blockWords.some(word => {
    if (word.trim() === '') return false;
    return username.toLowerCase().includes(word.toLowerCase()) || 
           commentText.toLowerCase().includes(word.toLowerCase());
  });
  
  if (shouldBlock) {
    // 标记为已处理，避免重复处理
    processedUsers.add(username);
    
    if (autoMode) {
      // 自动模式：直接处理
      blockUserByElement(commentElement);
    } else {
      // 手动模式：添加到队列
      blockQueue.push(commentElement);
      processBlockQueue(); // 尝试处理队列
    }
  }
}

// 通过评论元素找到并点击屏蔽按钮
function blockUserByElement(commentElement) {
  // 找到更多选项按钮并点击
  const moreButton = commentElement.querySelector('[data-testid="caret"]');
  if (moreButton) {
    moreButton.click();
    
    // 等待下拉菜单出现
    setTimeout(() => {
      // 找到屏蔽选项并点击
      const blockOption = Array.from(document.querySelectorAll('[role="menuitem"]'))
        .find(item => item.textContent.includes('屏蔽') || item.textContent.includes('Block'));
      
      if (blockOption) {
        blockOption.click();
        
        // 等待确认对话框出现
        setTimeout(() => {
          if (autoMode) {
            // 自动模式：直接查找并点击确认按钮
            const confirmButton = Array.from(document.querySelectorAll('div[role="button"]'))
              .find(button => (
                button.textContent.includes('屏蔽') || button.textContent.includes('Block')
              ));
            
            if (confirmButton) {
              confirmButton.click();
              
              // 增加屏蔽计数
              chrome.runtime.sendMessage({action: "incrementBlockCount"});
              console.log('已自动屏蔽包含屏蔽词的账号（自动模式）');
              
              // 自动模式下屏蔽完成后立即处理下一个
              setTimeout(() => {
                isProcessingBlock = false;
                processBlockQueue();
              }, 500);
            }
          } else {
            // 非自动模式：不做任何操作，等待用户手动确认
            console.log('已找到包含屏蔽词的账号，等待用户确认');
            // 用户手动确认后，对话框关闭事件将触发处理下一个
          }
        }, 500);
      } else {
        // 如果没有找到屏蔽选项，可能菜单已关闭，重置状态
        isProcessingBlock = false;
        processBlockQueue();
      }
    }, 500);
  } else {
    // 如果没有找到更多选项按钮，重置状态
    isProcessingBlock = false;
    processBlockQueue();
  }
}

// 监视DOM变化，检测新的评论
function observeComments() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 查找评论元素
            const commentElements = node.querySelectorAll('[data-testid="tweet"]');
            commentElements.forEach(checkAndBlockUser);
            
            // 如果节点本身就是评论元素
            if (node.getAttribute('data-testid') === 'tweet') {
              checkAndBlockUser(node);
            }
          }
        }
      }
    });
  });
  
  // 开始观察整个文档的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 页面加载完成后开始观察
window.addEventListener('load', function() {
  // 设置对话框关闭监听器
  setupDialogCloseListener();
  
  // 初始扫描现有评论
  document.querySelectorAll('[data-testid="tweet"]').forEach(checkAndBlockUser);
  
  // 开始观察新评论
  observeComments();
});