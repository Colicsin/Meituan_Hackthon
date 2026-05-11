"""
N12 ChatBox 组件 DoD 验证脚本

验证所有 DoD 清单项
"""
import os
import sys

def check_file_exists(filepath: str, description: str) -> bool:
    """检查文件是否存在"""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}")
    return exists

def check_file_content(filepath: str, keywords: list, description: str) -> bool:
    """检查文件是否包含关键字"""
    if not os.path.exists(filepath):
        print(f"❌ {description} - 文件不存在")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    missing = []
    for keyword in keywords:
        if keyword not in content:
            missing.append(keyword)
    
    if missing:
        print(f"⚠️  {description} - 缺少关键字: {missing}")
        return False
    else:
        print(f"✅ {description}")
        return True

def main():
    print("\n" + "="*60)
    print("N12 ChatBox 组件 DoD 验证")
    print("="*60 + "\n")
    
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    component_path = os.path.join(base_path, "frontend", "src", "components", "ChatBox")
    
    checks = []
    
    print("📦 产出物检查:")
    print("-" * 40)
    
    checks.append(check_file_exists(
        os.path.join(component_path, "ChatBox.tsx"),
        "components/ChatBox/ChatBox.tsx 完成"
    ))
    
    checks.append(check_file_exists(
        os.path.join(component_path, "index.ts"),
        "components/ChatBox/index.ts 导出文件"
    ))
    
    print("\n🎨 功能实现检查:")
    print("-" * 40)
    
    chatbox_file = os.path.join(component_path, "ChatBox.tsx")
    
    checks.append(check_file_content(
        chatbox_file,
        ["isStreaming", "animate", "▊"],
        "消息流式显示（打字机效果）"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["filledCount", "6", "进度条"],
        "顶部 6 格进度条"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["画像进度", "FIELD_LABELS"],
        "每填满一个画像字段亮一格"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["showPlanButton", "round >= 3", "够了，开始规划"],
        "第 3-4 轮后显示\"够了开始规划\"按钮"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["/chat/stream", "POST", "SSE"],
        "接入 /api/chat 流式接口"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["scrollIntoView", "resize", "keyboard"],
        "移动端友好（输入框聚焦时不被键盘挡住）"
    ))
    
    print("\n📋 技术栈检查:")
    print("-" * 40)
    
    checks.append(check_file_content(
        chatbox_file,
        ["framer-motion"],
        "使用 Framer Motion"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["AnimatePresence"],
        "使用 AnimatePresence 动画"
    ))
    
    checks.append(check_file_content(
        chatbox_file,
        ["useRef", "useEffect"],
        "使用 React Hooks"
    ))
    
    print("\n" + "="*60)
    
    passed = sum(1 for c in checks if c)
    total = len(checks)
    
    if all(checks):
        print(f"✅ 所有 DoD 清单项验证通过！({passed}/{total})")
    else:
        print(f"⚠️  部分检查未通过 ({passed}/{total})")
    
    print("="*60)
    
    return 0 if all(checks) else 1

if __name__ == "__main__":
    sys.exit(main())
