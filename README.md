# X-Bot-Blocker

一个自动识别和拉黑 X 平台（前 Twitter）上机器人账号的工具。

## 功能特点

- **智能检测**：基于用户名和内容关键词识别可疑账号
- **自动拉黑**：可选择手动提示或全自动拉黑模式
- **高度可配置**：支持自定义关键词、检测间隔和其他参数
- **实时监控**：持续扫描特定推文的回复，自动加载新内容
- **详细日志**：实时记录检测和拉黑情况

## 安装

1. 克隆仓库
   ```
   git clone https://github.com/your-username/x-bot-blocker.git
   cd x-bot-blocker
   ```

2. 安装依赖
   ```
   pip install -r requirements.txt
   ```

3. 确保已安装 Chrome 浏览器

## 快速开始

1. 修改 `config.json` 或使用默认配置
2. 运行示例脚本
   ```
   python examples/basic_usage.py --url "https://x.com/username/status/tweet_id"
   ```

## 详细用法

### 基本使用

```python
from x_bot_blocker import XBotBlocker

# 创建拦截器实例
blocker = XBotBlocker()

# 启动监控
blocker.start("https://x.com/username/status/tweet_id")

# 按 Ctrl+C 停止
```

### 自定义关键词

```python
# 添加用户名关键词
blocker.add_keywords("username", ["spam", "scam"])

# 添加内容关键词
blocker.add_keywords("content", ["click here", "limited time"])
```

### 启用自动拉黑

```python
# 切换自动拉黑模式
blocker.toggle_auto_mode()
# 或直接设置
blocker.config["auto_mode"] = True
```

## 注意事项

1. **CSS 选择器调整**：如果 X 平台更新了页面结构，可能需要调整 `utils/selectors.py` 中的选择器
2. **登录状态**：工具需要已登录的浏览器会话才能执行拉黑操作
3. **使用限制**：频繁的自动操作可能导致账号受到限制，请谨慎使用

## 贡献指南

欢迎提交 Pull Request 或创建 Issue。在提交代码前，请确保：

1. 代码风格符合 PEP 8 规范
2. 添加了必要的注释和文档
3. 通过了所有测试

## 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件
