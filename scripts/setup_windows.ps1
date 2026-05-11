# 智行伴侣项目一键部署脚本 (Windows)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  智行伴侣项目环境部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 检查必需软件
Write-Host "`n[1/5] 检查系统环境..." -ForegroundColor Yellow

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Node.js，请先安装: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 检查 Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Python，请先安装: https://python.org/" -ForegroundColor Red
    exit 1
}

# 检查 Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 未安装 Git，建议安装: https://git-scm.com/" -ForegroundColor Yellow
}

# 2. 后端环境设置
Write-Host "`n[2/5] 配置后端环境..." -ForegroundColor Yellow

# 创建虚拟环境
if (-not (Test-Path "backend\venv")) {
    Write-Host "创建 Python 虚拟环境..." -ForegroundColor Gray
    python -m venv backend\venv
}

# 激活虚拟环境
Write-Host "激活虚拟环境..." -ForegroundColor Gray
.\backend\venv\Scripts\Activate.ps1

# 安装依赖
Write-Host "安装后端依赖..." -ForegroundColor Gray
pip install -r backend\requirements.txt

# 3. 前端环境设置
Write-Host "`n[3/5] 配置前端环境..." -ForegroundColor Yellow

Set-Location frontend
npm install
Set-Location ..

# 4. 环境变量配置
Write-Host "`n[4/5] 配置环境变量..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ 已创建 .env 文件，请填写 API Keys" -ForegroundColor Green
} else {
    Write-Host "✅ .env 文件已存在" -ForegroundColor Green
}

# 5. 完成
Write-Host "`n[5/5] 部署完成！" -ForegroundColor Green
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  启动方式：" -ForegroundColor Cyan
Write-Host "  后端: cd backend && python run.py" -ForegroundColor White
Write-Host "  前端: cd frontend && npm run dev" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
