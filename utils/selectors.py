"""
X平台CSS选择器配置

注意：由于X平台的DOM结构可能会随时变化，如果工具不能正常工作，
请检查并更新这些选择器以匹配当前的网页结构。
"""

# 这些是X平台各元素的CSS选择器，需要根据实际DOM结构调整
X_SELECTORS = {
    # 回复容器
    "replies_container": "div[aria-label='Timeline: Conversation']",
    
    # 单条回复
    "reply": "article[data-testid='tweet']",
    
    # 用户名
    "username": "div[data-testid='User-Name'] span.css-901oao.css-16my406.r-poiln3",
    
    # 回复内容
    "content": "div[data-testid='tweetText']",
    
    # 更多选项按钮
    "more_options": "div[aria-label='More'][role='button']",
    
    # 拉黑选项 (下拉菜单中)
    "block_option": "div[role='menuitem'][data-testid='block']",
    
    # 确认拉黑按钮
    "confirm_block": "div[data-testid='confirmationSheetConfirm']",
    
    # 加载更多回复的区域
    "load_more_area": "div[role='button'][data-testid='cellInnerDiv']"
}

# 获取选择器
def get_selector(element_name):
    """
    获取指定元素的CSS选择器
    
    参数:
        element_name (str): 元素名称
        
    返回:
        str: CSS选择器
    """
    return X_SELECTORS.get(element_name, "")

# 更新选择器
def update_selector(element_name, new_selector):
    """
    更新指定元素的CSS选择器
    
    参数:
        element_name (str): 元素名称
        new_selector (str): 新的CSS选择器
    """
    if element_name in X_SELECTORS:
        X_SELECTORS[element_name] = new_selector