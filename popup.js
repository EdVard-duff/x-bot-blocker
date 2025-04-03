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

  // 保存按钮点击事件
  document.getElementById("saveButton").addEventListener("click", function () {
    const blockWordsText = document.getElementById("blockWords").value;
    const blockWords = blockWordsText
      .split("\n")
      .filter((word) => word.trim() !== "");

    chrome.storage.sync.set(
      {
        blockWords: blockWords
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
});