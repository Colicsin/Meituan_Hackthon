"""
N11 MoodDial 组件 DoD 验证脚本

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
    print("N11 MoodDial 组件 DoD 验证")
    print("="*60 + "\n")
    
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    component_path = os.path.join(base_path, "frontend", "src", "components", "MoodDial")
    
    checks = []
    
    print("📦 产出物检查:")
    print("-" * 40)
    
    checks.append(check_file_exists(
        os.path.join(component_path, "MoodDial.tsx"),
        "components/MoodDial/MoodDial.tsx 完成"
    ))
    
    checks.append(check_file_exists(
        os.path.join(component_path, "index.ts"),
        "components/MoodDial/index.ts 导出文件"
    ))
    
    print("\n🎨 功能实现检查:")
    print("-" * 40)
    
    mood_dial_file = os.path.join(component_path, "MoodDial.tsx")
    
    checks.append(check_file_content(
        mood_dial_file,
        ["热闹", "独处"],
        "横轴 \"热闹 ↔ 独处\""
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["高能", "静谧"],
        "纵轴 \"高能 ↔ 静谧\""
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["backgroundColor", "useTransform", "hsl"],
        "拖动时背景色实时渐变"
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["useSpring", "damping", "stiffness"],
        "释放时有阻尼回弹（useSpring）"
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["onChange", "x:", "y:"],
        "输出归一化情绪向量 {x, y}"
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["MOOD_LABELS", "getMoodLabel"],
        "显示当前位置情绪标签（9宫格）"
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["drag", "dragConstraints"],
        "支持触屏 + 鼠标拖动（Framer Motion）"
    ))
    
    print("\n📋 技术栈检查:")
    print("-" * 40)
    
    checks.append(check_file_content(
        mood_dial_file,
        ["framer-motion"],
        "使用 Framer Motion"
    ))
    
    checks.append(check_file_content(
        mood_dial_file,
        ["motion.div"],
        "使用 motion.div 组件"
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
