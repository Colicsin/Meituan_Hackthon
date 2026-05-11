# 智行伴侣 - Hackathon项目

Our Hackthon projects - 美团Hackathon参赛项目

## 项目结构

```
hackathon/
├── frontend/          # 前端项目（React + Vite）
│   ├── src/
│   │   ├── App.tsx    # 主应用组件
│   │   ├── index.css  # Tailwind CSS
│   │   └── main.tsx   # 入口文件
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/           # 后端项目（FastAPI）
│   ├── app/
│   │   ├── main.py    # FastAPI应用
│   │   ├── config.py  # 配置管理
│   │   ├── models/    # 数据模型
│   │   ├── api/       # API路由
│   │   ├── agents/    # AI智能体
│   │   ├── services/  # 业务逻辑
│   │   └── data/      # 数据文件
│   ├── requirements.txt
│   └── run.py         # 启动脚本
└── README.md
```

## 已安装的依赖

### 前端依赖

#### 生产依赖
- **zustand** - 状态管理
- **axios** - HTTP请求
- **framer-motion** - 动画库
- **react-router-dom** - 路由

#### 开发依赖
- **tailwindcss@3.4** - CSS框架
- **postcss** - CSS处理器
- **autoprefixer** - CSS自动前缀

### 后端依赖
- **fastapi** - Web框架
- **uvicorn** - ASGI服务器
- **httpx** - HTTP客户端
- **pydantic** - 数据验证
- **pydantic-settings** - 配置管理
- **python-dotenv** - 环境变量

## 启动方式

### 前端
```bash
cd hackathon/frontend
npm run dev
```
访问：http://localhost:5173

### 后端
```bash
cd hackathon/backend
python run.py
```
访问：http://localhost:8000

API文档：http://localhost:8000/docs

## 当前状态

✅ N3 前端骨架 - 已完成
- Vite + React + TypeScript 项目已创建
- Tailwind CSS 已配置
- 必要依赖已安装
- 可测试后端连接的界面已实现

✅ N2 后端骨架 - 已完成
- FastAPI 项目已创建
- CORS配置完成
- 基础路由已实现
  - GET / - 返回 {"ok": true}
  - GET /health - 健康检查

✅ N4 数据格式定义 - 已完成
- POI数据模型已定义（backend/app/models/poi.py）
- Mock数据已创建（backend/app/data/mock/pois.json）
- API路由已实现：
  - GET /api/pois - 获取所有POI
  - GET /api/pois/{id} - 获取单个POI
- 前端已展示POI数据列表

## 下一步

- [ ] N1: 建GitHub仓库
