"""
N13 ItineraryCard 组件 DoD 验证脚本
"""
import os
import sys

def check_file_exists(filepath: str, description: str) -> bool:
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}")
    return exists

def check_file_content(filepath: str, keywords: list, description: str) -> bool:
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
    print("N13 ItineraryCard 组件 DoD 验证")
    print("="*60 + "\n")
    
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    component_path = os.path.join(base_path, "frontend", "src", "components", "ItineraryCard")
    
    checks = []
    
    print("📦 产出物检查:")
    print("-" * 40)
    
    checks.append(check_file_exists(
        os.path.join(component_path, "ItineraryCard.tsx"),
        "components/ItineraryCard/ItineraryCard.tsx 完成"
    ))
    
    checks.append(check_file_exists(
        os.path.join(component_path, "ItineraryCardGroup.tsx"),
        "components/ItineraryCard/ItineraryCardGroup.tsx 完成"
    ))
    
    print("\n🎨 功能实现检查:")
    print("-" * 40)
    
    card_file = os.path.join(component_path, "ItineraryCard.tsx")
    
    checks.append(check_file_content(
        card_file,
        ["最快", "最美", "最省力"],
        "策略名（最快/最美/最省力）"
    ))
    
    checks.append(check_file_content(
        card_file,
        ["total_time_min", "total_price"],
        "每张卡片显示总时长和总预算"
    ))
    
    checks.append(check_file_content(
        card_file,
        ["STRATEGY_TAGS", "差异化标签"],
        "差异化标签显示"
    ))
    
    group_file = os.path.join(component_path, "ItineraryCardGroup.tsx")
    
    checks.append(check_file_content(
        group_file,
        ["overflow-x-auto", "flex gap-4"],
        "3张卡片横向排列（手机端可滑动）"
    ))
    
    checks.append(check_file_content(
        group_file,
        ["onSelect"],
        "选中后跳转回调"
    ))
    
    print("\n📋 技术栈检查:")
    print("-" * 40)
    
    checks.append(check_file_content(
        card_file,
        ["framer-motion", "motion.div"],
        "使用 Framer Motion 动画"
    ))
    
    checks.append(check_file_content(
        group_file,
        ["AnimatePresence"],
        "使用 AnimatePresence"
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
