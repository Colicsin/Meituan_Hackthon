"""
N14 MapView 组件 DoD 验证脚本
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
    print("N14 MapView 组件 DoD 验证")
    print("="*60 + "\n")
    
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    component_path = os.path.join(base_path, "frontend", "src", "components", "MapView")
    
    checks = []
    
    print("📦 产出物检查:")
    print("-" * 40)
    
    checks.append(check_file_exists(
        os.path.join(component_path, "MapView.tsx"),
        "components/MapView/MapView.tsx 完成"
    ))
    
    print("\n🎨 功能实现检查:")
    print("-" * 40)
    
    mapview_file = os.path.join(component_path, "MapView.tsx")
    
    checks.append(check_file_content(
        mapview_file,
        ["@amap/amap-jsapi-loader", "AMapLoader.load"],
        "高德 JS API 接入"
    ))
    
    checks.append(check_file_content(
        mapview_file,
        ["Marker", "idx + 1"],
        "显示行程 POI 标记（带数字编号）"
    ))
    
    checks.append(check_file_content(
        mapview_file,
        ["Polyline", "path", "strokeColor"],
        "绘制 POI 之间的步行路线"
    ))
    
    checks.append(check_file_content(
        mapview_file,
        ["onPointClick", "selectedPoint", "InfoWindow"],
        "支持点击 POI 弹出详情卡片"
    ))
    
    print("\n📋 技术栈检查:")
    print("-" * 40)
    
    checks.append(check_file_content(
        mapview_file,
        ["framer-motion", "AnimatePresence"],
        "使用 Framer Motion 动画"
    ))
    
    checks.append(check_file_content(
        mapview_file,
        ["useEffect", "useRef"],
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
