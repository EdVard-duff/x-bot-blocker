"""
X-Bot-Blocker 基本使用示例
演示如何使用 X-Bot-Blocker 工具监控和拦截机器人账号
"""

import os
import sys
import argparse
import time

# 添加父目录到路径，以便导入主模块
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from x_bot_blocker import XBotBlocker

def main():
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='X平台机器人账号自动拉黑工具')
    
    parser.add_argument('--url', type=str, help='要监控的推文URL', required=True)
    parser.add_argument('--config', type=str, help='配置文件路径', default='config.json')
    parser.add_argument('--auto', action='store_true', help='启用自动拉黑模式')
    parser.add_argument('--headless', action='store_true', help='启用无头模式（不显示浏览器窗口）')
    parser.add_argument('--interval', type=int, help='检查间隔（秒）', default=5)
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("X平台机器人账号自动拉黑工具")
    print("=" * 50)
    
    # 创建拦截器实例
    blocker = XBotBlocker(config_path=args.config)
    
    # 根据命令行参数更新配置
    if args.auto:
        blocker.config["auto_mode"] = True
        print("自动拉黑模式已启用")
        
    if args.headless:
        blocker.config["headless"] = True
        print("无头模式已启用")
        
    if args.interval:
        blocker.config["check_interval"] = args.interval
        print(f"检查间隔已设置为 {args.interval} 秒")
    
    # 显示当前配置
    blocker.show_config()
    
    try:
        print("\n按 Ctrl+C 可以停止监控")
        print("正在启动监控...\n")
        time.sleep(1)
        
        # 启动监控
        blocker.start(args.url)
        
    except KeyboardInterrupt:
        print("\n用户中断，正在停止...")
    except Exception as e:
        print(f"\n发生错误: {str(e)}")
    finally:
        # 停止监控并关闭浏览器
        blocker.stop()
        blocker.close()
        
        # 保存配置
        blocker.save_config()
        print("\n已保存配置并退出")

if __name__ == "__main__":
    main()