#!/usr/bin/env python3
"""环境检查脚本"""

import sys
import subprocess
from pathlib import Path

def check_command(cmd, name):
    """检查命令是否可用"""
    try:
        result = subprocess.run([cmd, "--version"], 
                              capture_output=True, 
                              text=True)
        version = result.stdout.split()[0] if result.stdout else "未知"
        print(f"✅ {name}: {version}")
        return True
    except:
        print(f"❌ {name}: 未安装")
        return False

def check_file(filepath, description):
    """检查文件是否存在"""
    if Path(filepath).exists():
        print(f"✅ {description}")
        return True
    else:
        print(f"❌ {description}: 文件不存在")
        return False

def main():
    print("========================================")
    print("  环境检查脚本")
    print("========================================\n")
    
    print("[系统软件]")
    checks = []
    checks.append(check_command("node", "Node.js"))
    checks.append(check_command("npm", "npm"))
    checks.append(check_command("python", "Python"))
    checks.append(check_command("git", "Git"))
    
    print("\n[项目文件]")
    checks.append(check_file("backend/requirements.txt", "后端依赖配置"))
    checks.append(check_file("backend/.env", "环境变量配置"))
    checks.append(check_file("frontend/package.json", "前端依赖配置"))
    checks.append(check_file("backend/app/main.py", "后端主文件"))
    checks.append(check_file("frontend/src/main.tsx", "前端主文件"))
    
    print("\n========================================")
    if all(checks):
        print("✅ 环境检查通过！")
        return 0
    else:
        print("❌ 部分检查未通过，请按提示修复")
        return 1

if __name__ == "__main__":
    sys.exit(main())
