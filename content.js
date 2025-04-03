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

// 创建简单的按钮点击事件函数
function simulateClick(element) {
  if (!element) return false;
  
  try {
    // 创建并分发点击事件
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(clickEvent);
    return true;
  } catch (error) {
    console.error('点击元素失败:', error);
    return false;
  }
}

// 等待元素出现的辅助函数
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 超时处理
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`等待元素 ${selector} 超时`));
    }, timeout);
  });
}

// 使用所有可能的选择器查找更多选项按钮
function findMoreButton(commentElement) {
  // 尝试各种可能的选择器
  const possibleSelectors = [
    '[data-testid="caret"]',
    '[aria-label="更多"]', 
    '[aria-label="More"]',
    'svg[data-icon="ellipsis"]'
  ];
  
  for (const selector of possibleSelectors) {
    const button = commentElement.querySelector(selector);
    if (button) return button;
  }
  
  return null;
}

// 查找屏蔽选项
function findBlockOption() {
  // 获取所有菜单项
  const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
  
  // 查找包含屏蔽相关文本的菜单项
  const blockText = ['屏蔽', 'Block', '拉黑', '不感兴趣'];
  
  for (const text of blockText) {
    const option = menuItems.find(item => item.textContent.includes(text));
    if (option) return option;
  }
  
  return null;
}

// 查找确认按钮
function findConfirmButton() {
  // 获取对话框
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  
  // 方法1: 通过文本内容查找
  const allButtons = Array.from(dialog.querySelectorAll('div[role="button"]'));
  const confirmTexts = ['屏蔽', 'Block', '拉黑', '确认'];
  
  for (const text of confirmTexts) {
    const button = allButtons.find(btn => 
      btn.textContent.includes(text) && 
      !btn.textContent.includes('取消') &&
      !btn.textContent.includes('Cancel')
    );
    if (button) return button;
  }
  
  // 方法2: 假设最后一个按钮是确认按钮
  if (allButtons.length > 0) {
    return allButtons[allButtons.length - 1];
  }
  
  // 方法3: 尝试通过特定属性查找
  return dialog.querySelector('[data-testid="confirmationSheetConfirm"]') || 
         dialog.querySelector('[data-testid="confirmationSheetAction"]');
}

// 监控对话框关闭事件
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
            }, 1000); // 延迟，确保UI完全更新
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

// 完全重写的屏蔽用户函数，使用异步/等待模式
async function blockUserByElement(commentElement) {
  console.log('开始屏蔽操作...');
  
  try {
    // 1. 找到更多选项按钮
    const moreButton = findMoreButton(commentElement);
    if (!moreButton) {
      throw new Error('未找到更多选项按钮');
    }
    console.log('找到更多选项按钮');
    
    // 点击更多选项按钮
    simulateClick(moreButton);
    console.log('已点击更多选项按钮');
    
    // 等待菜单出现 (0.5秒后尝试查找屏蔽选项)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. 查找屏蔽选项
    const blockOption = findBlockOption();
    if (!blockOption) {
      throw new Error('未找到屏蔽选项');
    }
    console.log('找到屏蔽选项:', blockOption.textContent);
    
    // 点击屏蔽选项
    simulateClick(blockOption);
    console.log('已点击屏蔽选项');
    
    // 等待确认对话框出现
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 3. 在自动模式下，查找并点击确认按钮
    if (autoMode) {
      console.log('自动模式: 查找确认按钮');
      const confirmButton = findConfirmButton();
      
      if (confirmButton) {
        console.log('找到确认按钮:', confirmButton.textContent);
        
        // 点击确认按钮
        simulateClick(confirmButton);
        console.log('已点击确认按钮');
        
        // 增加屏蔽计数
        chrome.runtime.sendMessage({action: "incrementBlockCount"});
        console.log('已自动屏蔽账号');
        
        // 等待对话框关闭后处理下一个
        await new Promise(resolve => setTimeout(resolve, 1000));
        isProcessingBlock = false;
        processBlockQueue();
      } else {
        console.error('未找到确认按钮');
        // 超时处理
        setTimeout(() => {
          isProcessingBlock = false;
          processBlockQueue();
        }, 2000);
      }
    } else {
      // 非自动模式，等待用户手动确认
      console.log('手动模式: 等待用户确认');
      // 用户确认后，由对话框关闭事件处理程序处理下一个
    }
  } catch (error) {
    console.error('屏蔽操作发生错误:', error);
    // 错误情况下，重置状态并处理下一个
    setTimeout(() => {
      isProcessingBlock = false;
      processBlockQueue();
    }, 1000);
  }
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
    
    // 添加到队列
    blockQueue.push(commentElement);
    
    // 尝试处理队列
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
  
  // 打印初始化信息
  console.log('X Bot Blocker 已启动');
  console.log('自动模式:', autoMode);
  console.log('屏蔽词数量:', blockWords.length);
});