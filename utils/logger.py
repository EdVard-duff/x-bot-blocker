"""
日志工具模块
提供格式化日志输出和保存功能
"""

import os
from datetime import datetime

# 日志级别颜色映射
LEVEL_COLORS = {
    "INFO": "\033[94m",    # 蓝色
    "ERROR": "\033[91m",   # 红色
    "SUCCESS": "\033[92m", # 绿色
    "WARNING": "\033[93m", # 黄色
    "DEBUG": "\033[96m"    # 青色
}

# 重置颜色
RESET_COLOR = "\033[0m"

class Logger:
    def __init__(self, debug=True, save_log=False, log_path="x_bot_blocker.log"):
        """
        初始化日志记录器
        
        参数:
            debug (bool): 是否启用调试模式
            save_log (bool): 是否保存日志到文件
            log_path (str): 日志文件路径
        """
        self.debug = debug
        self.save_log = save_log
        self.log_path = log_path
        
        # 如果日志文件存在且非空，添加分隔行
        if self.save_log and os.path.exists(self.log_path) and os.path.getsize(self.log_path) > 0:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write("\n" + "-" * 50 + "\n")
                f.write(f"新会话开始于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("-" * 50 + "\n")
    
    def log(self, message, level="INFO"):
        """
        记录日志
        
        参数:
            message (str): 日志消息
            level (str): 日志级别
        """
        # 如果非调试模式，只记录重要日志
        if not self.debug and level not in ["ERROR", "SUCCESS", "WARNING"]:
            return
            
        # 创建带时间戳的消息
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        
        # 控制台彩色输出
        level_upper = level.upper()
        color = LEVEL_COLORS.get(level_upper, LEVEL_COLORS["INFO"])
        print(f"{color}{log_message}{RESET_COLOR}")
        
        # 保存到日志文件
        if self.save_log:
            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    f.write(log_message + "\n")
            except Exception as e:
                print(f"{LEVEL_COLORS['ERROR']}[ERROR] 写入日志文件失败: {str(e)}{RESET_COLOR}")
    
    def info(self, message):
        """记录信息级别日志"""
        self.log(message, "INFO")
    
    def error(self, message):
        """记录错误级别日志"""
        self.log(message, "ERROR")
    
    def success(self, message):
        """记录成功级别日志"""
        self.log(message, "SUCCESS")
    
    def warning(self, message):
        """记录警告级别日志"""
        self.log(message, "WARNING")
    
    def debug(self, message):
        """记录调试级别日志"""
        self.log(message, "DEBUG")