#!/bin/bash
# 智行伴侣项目一键部署脚本 (Unix-like)

echo "========================================"
echo "  智行伴侣项目环境部署脚本"
echo "========================================"

# 1. 检查必需软件
echo -e "\n[1/5] 检查系统环境..."

# 检查 Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ 未安装 Node.js，请先安装: https://nodejs.org/"
    exit 1
fi

# 检查 Python
if command -v python3 &> /dev/null; then
    echo "✅ Python: $(python3 --version)"
elif command -v python &> /dev/null; then
    echo "✅ Python: $(python --version)"
else
    echo "❌ 未安装 Python，请先安装: https://python.org/"
    exit 1
fi

# 检查 Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "⚠️ 未安装 Git，建议安装: https://git-scm.com/"
fi

# 2. 后端环境设置
echo -e "\n[2/5] 配置后端环境..."

# 创建虚拟环境
if [ ! -d "backend/venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv backend/venv 2>/dev/null || python -m venv backend/venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source backend/venv/bin/activate

# 安装依赖
echo "安装后端依赖..."
pip install -r backend/requirements.txt

# 3. 前端环境设置
echo -e "\n[3/5] 配置前端环境..."

cd frontend
npm install
cd ..

# 4. 环境变量配置
echo -e "\n[4/5] 配置环境变量..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ 已创建 .env 文件，请填写 API Keys"
else
    echo "✅ .env 文件已存在"
fi

# 5. 完成
echo -e "\n[5/5] 部署完成！"
echo -e "\n========================================"
echo "  启动方式："
echo "  后端: cd backend && python run.py"
echo "  前端: cd frontend && npm run dev"
echo "========================================"
