// popup.js - 处理插件界面的逻辑
document.addEventListener("DOMContentLoaded", function () {
  // 加载保存的屏蔽词
  chrome.storage.sync.get("blockWords", function (data) {
    if (data.blockWords) {
      document.getElementById("blockWords").value = data.blockWords.join("\n");
    }
  });

  // 加载已屏蔽账号数量
  chrome.storage.sync.get("blockedCount", function (data) {
    if (data.blockedCount) {
      document.getElementById("blockedCount").textContent = data.blockedCount;
    }
  });

  // 加载自动模式设置
  chrome.storage.sync.get("autoMode", function (data) {
    document.getElementById("autoModeToggle").checked = data.autoMode || false;
  });

  // 保存按钮点击事件
  document.getElementById("saveButton").addEventListener("click", function () {
    const blockWordsText = document.getElementById("blockWords").value;
    const blockWords = blockWordsText
      .split("\n")
      .filter((word) => word.trim() !== "");
    const autoMode = document.getElementById("autoModeToggle").checked;

    chrome.storage.sync.set(
      {
        blockWords: blockWords,
        autoMode: autoMode,
      },
      function () {
        const statusElement = document.getElementById("statusMessage");
        statusElement.textContent = "设置已保存!";
        setTimeout(function () {
          statusElement.textContent = "";
        }, 2000);
      }
    );
  });

  // 自动模式切换事件（实时保存）
  document
    .getElementById("autoModeToggle")
    .addEventListener("change", function () {
      const autoMode = this.checked;
      chrome.storage.sync.set({ autoMode: autoMode });
    });
});
