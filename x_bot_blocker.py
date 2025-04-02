"""
X平台机器人账号自动拉黑工具

使用Selenium自动化识别和拉黑X平台（前Twitter）上的机器人账号。
根据用户名和回复内容中的关键词来检测可疑账号。
"""

import time
import json
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# 导入工具模块
from utils.selectors import get_selector
from utils.logger import Logger

class XBotBlocker:
    def __init__(self, config_path=None):
        """
        初始化X机器人拦截器
        
        参数:
            config_path (str, optional): 配置文件路径
        """
        # 默认配置
        self.config = {
            # 用户名中的关键词
            "username_keywords": ["bot", "crypto", "nft", "airdrop", "giveaway", "earn", "free"],
            # 回复内容中的关键词
            "content_keywords": ["dm me", "check dm", "earn money", "make money", "free crypto", 
                               "join now", "click link", "get rich"],
            # 检查间隔（秒）
            "check_interval": 5,
            # 是否启用自动模式
            "auto_mode": False,
            # 调试模式
            "debug": True,
            # 等待超时（秒）
            "timeout": 10,
            # 浏览器选项
            "headless": False,
            # 保存日志
            "save_log": True,
            # 日志文件路径
            "log_path": "x_bot_blocker_log.txt"
        }
        
        # 如果提供了配置文件，则加载
        if config_path and os.path.exists(config_path):
            self._load_config(config_path)
        elif config_path and not os.path.exists(config_path):
            # 如果提供的配置文件不存在，保存当前配置
            self.save_config(config_path)
            
        # 初始化日志记录器
        self.logger = Logger(
            debug=self.config["debug"],
            save_log=self.config["save_log"],
            log_path=self.config["log_path"]
        )
            
        self.blocked_count = 0
        self.driver = None
        self.is_running = False
        
        self.logger.info("X机器人拦截器已初始化")
    
    def _load_config(self, config_path):
        """
        从JSON文件加载配置
        
        参数:
            config_path (str): 配置文件路径
        """
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                self.config.update(user_config)
                print(f"已从 {config_path} 加载配置")
        except Exception as e:
            print(f"加载配置文件失败: {str(e)}")
    
    def save_config(self, config_path="x_bot_blocker_config.json"):
        """
        保存当前配置到JSON文件
        
        参数:
            config_path (str, optional): 配置文件保存路径
        """
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=4)
                self.logger.info(f"配置已保存到 {config_path}")
        except Exception as e:
            self.logger.error(f"保存配置文件失败: {str(e)}")
    
    def initialize_browser(self):
        """初始化浏览器"""
        if self.driver:
            self.logger.info("浏览器已经初始化")
            return
            
        self.logger.info("正在初始化浏览器...")
        
        options = webdriver.ChromeOptions()
        if self.config["headless"]:
            options.add_argument('--headless')
        
        # 添加其他浏览器选项
        options.add_argument('--disable-gpu')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-extensions')
        
        # 使用用户数据目录可以保持登录状态
        # options.add_argument('--user-data-dir=./chrome_profile')
        
        try:
            self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            self.driver.set_window_size(1280, 800)
            self.logger.success("浏览器初始化成功")
        except Exception as e:
            self.logger.error(f"浏览器初始化失败: {str(e)}")
            raise
    
    def navigate_to_url(self, url):
        """
        导航到指定URL
        
        参数:
            url (str): 要访问的URL
            
        返回:
            bool: 是否成功导航
        """
        try:
            self.logger.info(f"正在导航到 {url}")
            self.driver.get(url)
            # 等待页面加载
            WebDriverWait(self.driver, self.config["timeout"]).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            self.logger.success(f"已加载页面 {url}")
            return True
        except Exception as e:
            self.logger.error(f"导航到 {url} 失败: {str(e)}")
            return False
    
    def add_keywords(self, keyword_type, keywords):
        """
        添加关键词
        
        参数:
            keyword_type (str): 关键词类型 ('username' 或 'content')
            keywords (str|list): 要添加的关键词或关键词列表
        """
        if keyword_type == "username":
            key = "username_keywords"
        elif keyword_type == "content":
            key = "content_keywords"
        else:
            self.logger.error(f"未知的关键词类型: {keyword_type}")
            return
        
        # 确保keywords是列表
        if isinstance(keywords, str):
            keywords = [keywords]
            
        # 添加新关键词并去重
        self.config[key] = list(set(self.config[key] + keywords))
        self.logger.info(f"已添加{keyword_type}关键词: {', '.join(keywords)}")
    
    def remove_keywords(self, keyword_type, keywords):
        """
        移除关键词
        
        参数:
            keyword_type (str): 关键词类型 ('username' 或 'content')
            keywords (str|list): 要移除的关键词或关键词列表
        """
        if keyword_type == "username":
            key = "username_keywords"
        elif keyword_type == "content":
            key = "content_keywords"
        else:
            self.logger.error(f"未知的关键词类型: {keyword_type}")
            return
        
        # 确保keywords是列表
        if isinstance(keywords, str):
            keywords = [keywords]
            
        # 移除指定关键词
        self.config[key] = [k for k in self.config[key] if k not in keywords]
        self.logger.info(f"已移除{keyword_type}关键词: {', '.join(keywords)}")
    
    def check_username(self, username):
        """
        检查用户名是否包含关键词
        
        参数:
            username (str): 要检查的用户名
            
        返回:
            bool: 是否包含关键词
        """
        if not username:
            return False
            
        username = username.lower()
        return any(keyword.lower() in username for keyword in self.config["username_keywords"])
    
    def check_content(self, content):
        """
        检查内容是否包含关键词
        
        参数:
            content (str): 要检查的内容
            
        返回:
            bool: 是否包含关键词
        """
        if not content:
            return False
            
        content = content.lower()
        return any(keyword.lower() in content for keyword in self.config["content_keywords"])
    
    def block_user(self, username=None, element=None):
        """
        拉黑用户
        
        参数:
            username (str, optional): 用户名（仅用于日志记录）
            element (WebElement): 用户的回复元素
            
        返回:
            bool: 是否成功拉黑
        """
        try:
            if element is None:
                self.logger.error("缺少用户元素，无法执行拉黑操作")
                return False
                
            # 点击回复上的"更多"按钮
            more_button = element.find_element(By.CSS_SELECTOR, get_selector("more_options"))
            self.logger.debug("点击更多选项按钮")
            more_button.click()
            time.sleep(1)
            
            # 查找并点击"拉黑"选项
            self.logger.debug("查找拉黑选项")
            block_option = self.driver.find_element(By.CSS_SELECTOR, get_selector("block_option"))
            block_option.click()
            time.sleep(1)
            
            # 确认拉黑
            self.logger.debug("确认拉黑")
            confirm_button = self.driver.find_element(By.CSS_SELECTOR, get_selector("confirm_block"))
            confirm_button.click()
            
            self.blocked_count += 1
            self.logger.success(f"已拉黑用户: {username or '未知用户'}")
            
            # 等待拉黑操作完成
            time.sleep(2)
            return True
                
        except Exception as e:
            self.logger.error(f"拉黑用户失败: {str(e)}")
            return False
    
    def scan_replies(self):
        """扫描当前页面的回复"""
        try:
            # 等待回复容器加载
            WebDriverWait(self.driver, self.config["timeout"]).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, get_selector("replies_container")))
            )
            
            # 获取所有回复元素
            replies = self.driver.find_elements(By.CSS_SELECTOR, get_selector("reply"))
            
            # 过滤已处理的回复（可以通过添加特性标记来跟踪）
            if hasattr(self, 'processed_replies'):
                new_replies = [r for r in replies if r not in self.processed_replies]
                if new_replies:
                    self.logger.info(f"找到 {len(new_replies)} 条新回复")
                replies = new_replies
            else:
                self.processed_replies = set()
                self.logger.info(f"找到 {len(replies)} 条回复")
            
            if len(replies) == 0:
                return
            
            for reply in replies:
                try:
                    # 添加到处理过的集合
                    self.processed_replies.add(reply)
                    
                    # 提取用户信息
                    username_elem = reply.find_element(By.CSS_SELECTOR, get_selector("username"))
                    username = username_elem.text if username_elem else "未知用户"
                    
                    content_elem = reply.find_element(By.CSS_SELECTOR, get_selector("content"))
                    content = content_elem.text if content_elem else ""
                    
                    # 检查用户名和内容
                    is_spam_username = self.check_username(username)
                    is_spam_content = self.check_content(content)
                    
                    if is_spam_username or is_spam_content:
                        reason = []
                        if is_spam_username:
                            reason.append("用户名关键词")
                        if is_spam_content:
                            reason.append("内容关键词")
                            
                        self.logger.warning(f"检测到可疑回复: {username}\n内容: {content}\n原因: {' 和 '.join(reason)}")
                        
                        if self.config["auto_mode"]:
                            self.block_user(username, reply)
                        else:
                            self.logger.info(f"建议拉黑: {username} (自动模式关闭)")
                except Exception as e:
                    self.logger.error(f"处理回复时出错: {str(e)}")
            
        except TimeoutException:
            self.logger.warning("等待回复加载超时")
        except Exception as e:
            self.logger.error(f"扫描回复时出错: {str(e)}")
    
    def start(self, url=None):
        """
        启动监控
        
        参数:
            url (str, optional): 要监控的推文URL
        """
        if self.is_running:
            self.logger.info("监控已经在运行中")
            return
            
        try:
            # 初始化浏览器
            if not self.driver:
                self.initialize_browser()
                
            # 如果提供了URL，则导航到该URL
            if url:
                success = self.navigate_to_url(url)
                if not success:
                    return
                    
            self.is_running = True
            self.logger.success("开始监控回复...")
            
            # 监控循环
            while self.is_running:
                try:
                    self.scan_replies()
                    
                    # 滚动页面以加载更多回复
                    self.driver.execute_script("window.scrollBy(0, 500);")
                    self.logger.debug("页面已滚动，加载更多回复")
                    
                    # 等待指定时间
                    time.sleep(self.config["check_interval"])
                except KeyboardInterrupt:
                    self.stop()
                    break
                except Exception as e:
                    self.logger.error(f"监控过程中出错: {str(e)}")
                    time.sleep(self.config["check_interval"])  # 出错时也等待一下再继续
                    
        except Exception as e:
            self.logger.error(f"启动监控失败: {str(e)}")
            self.is_running = False
    
    def stop(self):
        """停止监控"""
        if not self.is_running:
            self.logger.info("监控未在运行")
            return
            
        self.is_running = False
        self.logger.success(f"停止监控。共拉黑 {self.blocked_count} 个账号")
    
    def close(self):
        """关闭浏览器并清理资源"""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
                self.logger.success("已关闭浏览器")
        except Exception as e:
            self.logger.error(f"关闭浏览器时出错: {str(e)}")
    
    def toggle_auto_mode(self):
        """切换自动模式"""
        self.config["auto_mode"] = not self.config["auto_mode"]
        status = "开启" if self.config["auto_mode"] else "关闭"
        self.logger.info(f"自动拉黑模式: {status}")
    
    def show_config(self):
        """显示当前配置"""
        print("\n===== X Bot Blocker 配置 =====")
        for key, value in self.config.items():
            if isinstance(value, list):
                print(f"{key}: {', '.join(value)}")
            else:
                print(f"{key}: {value}")
        print(f"已拉黑数量: {self.blocked_count}")
        print("=============================\n")


# 如果直接运行此文件
if __name__ == "__main__":
    print("X机器人拦截器不应直接运行。")
    print("请使用 examples/basic_usage.py 中的示例或创建自己的脚本。")
    print("\n例如:")
    print("from x_bot_blocker import XBotBlocker")
    print("blocker = XBotBlocker()")
    print("blocker.start('https://x.com/username/status/tweet_id')")